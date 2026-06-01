# Round 5 — Rollup & Steering-Doc Proposal

## Run tag
2026-05-25-product-interaction-retro
## Branch
fix/codex-init-write
## Patrol cycles completed
3（reality-scan / ranking / upgrade-evaluation）+ 本轮 rollup

---

## 1. Rollup（kept vs discarded）

`.clavue/retro/results.tsv` 本次 run 共 2 条新行：

| 行 | status | slice | 备注 |
|---|---|---|---|
| `2026-05-25T07:05:55Z` | keep | reality-scan | 扫出 4 个交互摩擦 + steering 文档缺失 |
| `2026-05-25T07:14:44Z` | keep | menu-ctrl-c-silent-return | 19 行 + 4 测；321 测试 / expect e2e 通过 |

`.clavue/retro/parked.tsv` 进 4 个未选候选：
- status-language-unify（19/25，Δ+0.25）
- doctor-staged-output（15/25，Δ+0.15）
- product-architecture-md-stubs（15/25，Δ+0.0；本轮 Round 5 产建议）
- menu-auto-return（18/25，Δ+0.3，**已并入候选 A 的考察范围**——评估后决定保留 trailing prompt，因为 doctor 场景需要看输出闸）

`.clavue/retro/calibration.tsv`：predicted +0.7 / actual +0.6（偏差 0.1，低于 0.4 阈值，预测校准良好）。

---

## 2. 单一最高杠杆 pending 升级

**候选 B：`status` 输出 Profile 段语言统一**。

一句话理由：`status` 表格里 `(直接配置)` 与下方 `Profile: 未配置` 是同一事实的两种表达，对"一眼看全状态"是直接干扰；改动单文件、可单测、零业务风险，是下一轮自然的 +0.25 Δ。

---

## 3. PRODUCT.md 提案（staged, NOT applied）

仓库当前**没有** `PRODUCT.md`。建议**新建**一份最小骨架（≤ 80 行）作为 program.md 等价物：

```markdown
# PRODUCT.md — ccjk 产品身份

> 「Clavue / Claude Code / Codex 的本地配置 CLI。」
> — package.json

## 1. 目标用户
- 主体：会用终端、需要在多个 API key / provider / profile 间切换的开发者
- 次要：CI 流水线（doctor --json / probe --json / profile-diff --json）

## 2. 主路径（5 分钟）
setup → code → validate → recover → deliver

| 阶段 | 命令 |
|---|---|
| setup | `ccjk onboard` → `ccjk init` |
| code（无需 ccjk 介入）| 用户用 Claude Code / Clavue / Codex 自身写代码 |
| validate | `ccjk doctor` / `ccjk probe` |
| recover | `ccjk rollback` / `ccjk doctor --fix` |
| deliver | `ccjk profile export` / `ccjk migrate` |

## 3. 产品边界（不做清单）
- 不主动写代码
- 不装 hooks
- 不开后台进程
- 不动 Claude/Clavue/Codex 自身的运行时
- 单向：settings → profile（migrate）；不反向覆盖 settings

## 4. 默认体验承诺
- 任何子菜单 ESC/Ctrl+C 必须**静默回菜单**（v15.27.1 修复）
- `ccjk doctor` exit code: clean=0 / warn=1 / error=2（v15.25 落地）
- `ccjk use <profile>` 默认同步全部已装工具（clavue + claude-code + codex）
- 任何破坏性写操作前都自动备份；`ccjk rollback` 可恢复

## 5. 路线图锚点（见 docs/HARDENING-ROADMAP.md）
（建议把 HARDENING-ROADMAP 的 P0/P1/P2 摘要在这里引出 5 行）
```

**为什么不直接写入**：协议要求 Round 5 staged-only；且 PRODUCT.md 是 human-owned program.md 等价物，新建文档级别需要用户拍板。

---

## 4. ARCHITECTURE.md 提案（staged, NOT applied）

仓库**没有** `ARCHITECTURE.md`。但 `src/` 已经形成清晰分层：

```
src/
  cli.ts                  -- 唯一 program 入口；只装命令路由
  commands/               -- 1 命令 1 文件；通过 cli.action() 注入参数
  core/                   -- 纯逻辑（profiles, settings, lint, codex-config, toml, perms, term, banner ...）
  i18n/                   -- 区域化
tests/
  commands/               -- 命令级集成测
src/**/<file>.test.ts     -- core 纯函数单测
```

建议新建 `ARCHITECTURE.md`（≤ 100 行）锚定 3 条不变量：

```markdown
# ARCHITECTURE.md — ccjk 代码组织

## 1. 分层
- cli.ts：仅做参数路由 → commands/*
- commands/*：一文件一命令；与终端 IO 紧耦合
- core/*：纯函数，无 IO 边界；测试都打这层
- i18n/locales/{en,zh-CN}/*.json：所有用户可见字串

## 2. 不变量
- 任何写盘操作必须先调用 `core/backup` 落 `.bak-<ts>` 备份
- `core/lint.ts` 的 KNOWN_ENV 白名单 + KNOWN_BAD_ENV 黑名单是 settings.json 体检的唯一真源
- inquirer prompt 抛 `ExitPromptError` 是用户主动取消 — 顶层 cli.ts 静默退出，菜单循环 `continue`（v15.27.1 落地）

## 3. 跨工具同步策略
- `clavue` ↔ `claude-code`：共享 `~/.claude/settings.json` 结构
- `codex`：独立 `~/.codex/config.toml`，profile 信息写 `[profiles.<name>]` 段（v15.20）
- `ccjk use` 默认 fan-out 到所有已装工具；`-t <tool>` 限定单工具

## 4. 测试金字塔
- core/*.test.ts：纯函数（300+）
- tests/commands/*.test.ts：mock IO 的命令级集成测
- 端到端：expect 脚本 + dist smoke（不入 CI，按需）

## 5. 发布
- 单分支 `main`；不 force push
- 每个 release：bump package.json → CHANGELOG → tag → npm publish
```

**为什么 staged**：仓库 332 commit 已经走过 v15.20–v15.27 但从未沉淀架构文件；先让用户审「3 条不变量」和「测试金字塔」是否准确再 commit。

---

## 5. clavue.md 提案（staged, NOT applied）

不需要改 `clavue.md`。本轮没有新规则被「升格」或「退役」——`isExitPromptCancellation` 是一个实现细节，归 ARCHITECTURE 的「不变量 #3」而不是全局开发约束。

---

## 6. 留给人类决策的开放问题（≤ 3）

1. PRODUCT.md / ARCHITECTURE.md 是否要作为 v15.28.0 的一部分发版？（建议：是，但**作为 docs-only 单独 commit**，不夹在功能 release 里。）
2. 候选 B（status 语言统一）下一轮跑还是合入 v15.27.1 一起做 patch release？（推荐：作为 patch，因为它是纯交互细节修复。）
3. 已开启的「expect e2e 测试」是否要进 CI？（推荐：暂不进 CI，留在 `.clavue/retro/scripts/` 作 retro 时的 before/after 验证工具；CI 进了反而需要装 expect、增加链路噪音。）

---

## 7. Steering 提案状态
**ALL PROPOSALS ARE STAGED, NOT APPLIED.** 等用户审过 #1–#3 再决定要不要落 docs commit。
