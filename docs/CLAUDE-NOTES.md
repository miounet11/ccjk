# CCJK 项目持久指导笔记 (CLAUDE-NOTES)

> **所有工具（clavue / claude-code / codex / grok）的持久项目知识以本文为唯一来源。**
> 工具原生 `CLAUDE.md` / `clavue.md` / `AGENTS.md` 易被各工具 `/init` 覆盖，请**优先阅读并依赖本文**。

## 项目概览
- **名称**：ccjk —— Clavue / Claude Code / Codex / Grok 的本地配置 CLI
- **当前版本**：15.27.6
- **当前分支**：`fix/codex-init-write`（领先 origin 18 commits）
- **描述**：统一 profile 切换、权限档位、状态栏、MCP、版本管理于一条命令。
- **仓库**：https://github.com/miounet11/ccjk
- **主路径**（5 分钟）：setup（onboard/init）→ code（用原生工具写代码）→ validate（doctor/probe/bench）→ recover（rollback/doctor --fix）→ deliver（profile export / migrate）

## 核心纪律（每次任务必须遵守）
- 始终用**中文简体**回复。
- 遵循全局 [Coding Discipline Baseline](~/.clavue/clavue.md)（Karpathy 风格）+ 本项目规则。
- **Surgical & Goal-driven**：最小代码满足请求；把模糊任务转为可验证目标；循环直到验证通过。
- **验证命令**（有意义变更后必须本地跑）：
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`（或 curated `pnpm test:run` / `pnpm test:release`）
  - Codex / Claude 集成路径 smoke：`echo '<option>' | node dist/cli.mjs`
- **Anti-aggression**：ccjk 仅补充 Claude Code 等运行时；绝不在 Claude 运行时自动注入 hook。Skills 仅显式调用。
- **Workspace 所有权**：ccjk 配置只活在 `~/.ccjk/`；**绝不混入** `~/.claude/`、`~/.codex/`、`~/.clavue/`、`.claude/`、`.clavue/`。
- **备份先行**：任何写盘必须先产生 `.bak-<ts>`（rollback 命令兑现）。
- **Lint 三层模型**（core/lint.ts）：白名单 KNOWN_ENV + 黑名单 KNOWN_BAD_ENV + 启发式（过宽 bash、stale key helper 等）。

## 架构与关键文档指针（只读这些，不要重复）
- 完整代码组织与不变量：`ARCHITECTURE.md`
- 产品身份与主路径：`PRODUCT.md`
- 实现总览与历史沉淀：`IMPLEMENTATION_SUMMARY.md`、`docs/ccjk-all-implementation-summary.md`、`docs/v11-implementation-summary.md` 等
- 演进路线与硬化：`docs/HARDENING-ROADMAP.md`、`docs/RELEASE-NOTES.md`、`CHANGELOG.md`
- 源码结构（当前 src 薄层 + dist 运行时）：
  - `src/cli.ts`（唯一入口）
  - `src/commands/`（一命令一文件）
  - `src/core/`（纯函数 + 测试：tools.ts、profiles.ts、codex-config.ts、grok-config.ts、settings.ts、lint.ts、perms.ts、modes.ts）
  - `dist/`（实际执行的 chunks / shared）
  - `packages/`（daemon、evolution、server 等）
- 配置统一核心：`src/core/tools.ts`（4 工具元数据 + capabilities）、`profiles.ts`（中央 profile 源，fan-out 适配各工具）
- 指令注入模板：`dist/templates/common/karpathy-baseline.md`（含本规则说明）

## 当前焦点与已知状态（2026-06）
- 正在进行 `fix/codex-init-write`：Codex init write 路径增强。
- 最近完成并验证（retro 2026-05-25）：`ccjk doctor` 新增 `[Runtime] shell environment` 段，检测 shell rc env shadow（切 profile 后未生效的头号黑洞）；status 表加 drift badge。
- 其他进行中规划见 `.ccjk/plan/current/`（EXECUTIVE_SUMMARY、PHASE*、云服务端 API、菜单系统、认知演进等）。
- 大量历史回溯与实现细节已沉淀在 `docs/` 与 `.clavue/retro/`（本次 NOTES 仅保留指针，避免膨胀）。

## 各工具在本项目下的期望行为
- **Clavue（主推） / Claude Code**：启动后立即读取项目根 `clavue.md` / `CLAUDE.md` → 跳转本文。
- **Codex**：`AGENTS.md` 指向本文 + shared handbook 指针。
- **Grok**：见下节（当前 capabilities 限制写入，仅文档 + 启动提示）。

## Grok 项目级支持
- ccjk 当前对 Grok：仅探测安装 / OAuth 登录状态（`~/.grok/auth.json`）、生成启动建议命令。不写持久配置（capabilities 显式全 false）。
- 推荐：先 `grok login`，然后在对话中显式引用 `docs/CLAUDE-NOTES.md`（或项目根 `GROK.md`）。
- 项目指南文件：`GROK.md`（或 `docs/GROK-PROJECT-GUIDE.md`）包含本 NOTES 指针 + xAI 模型建议 + 本项目验证习惯。
- 未来若 Grok 开放文件配置，ccjk 将通过扩展 capabilities 纳入统一层。

## 变更管理
- 本 NOTES 是**手动维护的蒸馏版**会话接管产物（2026-06 由 Grok 基于 plan mode 探索 + 用户确认创建）。
- 任何重大架构、纪律、验证命令变更，必须同步更新本文 + 根级 3 个指令文件。
- 未来若推进“全面统一指令层”（B 路线图），将把本文作为 ccjk 指令同步的 source of truth（参考 plan mode 期间生成的 2 个 explore subagent 报告）。

## 参考（快速跳转）
- 全局 baseline：`~/.clavue/clavue.md`（完整 Karpathy + 项目规则）
- 最近回溯：`.clavue/retro/latest.md`
- ccjk 内部计划状态：`.ccjk/plan/current/`
- 历史快照（仅参考）：`.claude/worktrees/release-14-1-3/`

---

**本次接管完成**：已创建本文 + 根级 wrapper 文件，让新对话在 4 工具中立即获得一致持久上下文。

## 验证记录（2026-06-01 本次接管后）

- `pnpm typecheck`：通过（exit 0）
- `pnpm lint`：通过（exit 0）
- `pnpm test`：29/31 文件通过（342/344 测试通过）。2 个失败为预先存在（src/core/term.test.ts locale/unicode env 测试，与本次 .md 文件变更无关）。
- 新文件存在性：`docs/CLAUDE-NOTES.md` + 根 `CLAUDE.md`、`clavue.md`、`AGENTS.md`、`GROK.md` 全部确认创建。
- Smoke / doctor 受限于当前环境 runtime dep（'tar' 等，非本次引入）；核心 TS 验证已通过。
- Git 影响：仅新增 5 个 .md 文件（纯文档，无源码改动），符合 A 方案“最小侵入”。

**结论**：本次项目级接管完成，4 工具新对话即可拾取统一持久指导。无回归引入。
