---
name: ccjk-project-architect
description: CCJK 项目专用架构师模式。所有持久知识以 docs/CLAUDE-NOTES.md 为准。工具原生 AGENTS.md 易被覆盖。
---

# CCJK 项目级 Codex AGENTS 指令

**持久知识唯一来源**：`docs/CLAUDE-NOTES.md`（请**优先阅读**）

本文件为 Codex 可读 wrapper。当前分支 `fix/codex-init-write`，版本 15.27.6。

> **Most Important: Always respond in Chinese-simplified**  
> 严格遵循全局 AGENTS.md 的 senior-architect 精神 + 本项目 Coding Discipline Baseline（见 docs/CLAUDE-NOTES.md）。

**核心指针**（不要重复全文）：
- 架构与不变量：ARCHITECTURE.md
- 产品与主路径：PRODUCT.md
- 验证命令：`pnpm typecheck && pnpm lint && pnpm test`
- 最近完成：doctor runtime env shadow 检测 + status drift badge（retro 2026-05-25 验证通过）

**Grok 集成**：见 docs/CLAUDE-NOTES.md Grok 段 + 项目根 GROK.md（即将创建）。

所有重大决策必须先在 NOTES 中记录。
