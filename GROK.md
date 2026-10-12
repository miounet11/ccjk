# CCJK 项目级 Grok 指南

**持久知识唯一来源**：`docs/CLAUDE-NOTES.md`（请**优先阅读**）

## 当前状态
- ccjk 对 Grok 支持：仅探测（`~/.grok/auth.json` OAuth）、生成启动命令。不写入持久配置（capabilities 显式限制）。
- 推荐流程：
  1. `grok login`（如未登录）
  2. 在新对话开头显式：`请先读取 docs/CLAUDE-NOTES.md 和 GROK.md，严格用中文简体，遵循本项目纪律。`

## 启动建议（参考 src/core/grok-config.ts 生成逻辑）
- 普通：`grok`
- 指定模型（若支持）：`grok -m <model>`
- 结合项目上下文：启动后立即 cat docs/CLAUDE-NOTES.md | head -40

## 与其他工具一致性
- 所有架构、纪律、验证命令、当前分支（fix/codex-init-write）均见 `docs/CLAUDE-NOTES.md`
- 根级 wrapper 已就位：CLAUDE.md（Claude Code）、clavue.md（主推）、AGENTS.md（Codex）

## 未来
当 Grok 开放文件级指令支持时，ccjk 将通过扩展 capabilities 纳入统一管理（见 NOTES 路线图段）。

**验证习惯**：`pnpm typecheck && pnpm lint && pnpm test`
