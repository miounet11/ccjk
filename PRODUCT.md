# PRODUCT.md — ccjk 产品身份

> 「Clavue / Claude Code / Codex / Grok 的本地配置 CLI。」
> — package.json description

本文件是 ccjk 的 program.md：人类拥有的 steering 文档。代码改动可以指出本文件需要更新的地方，但不直接 silent rewrite 本文件。

---

## 1. 目标用户

- **主体**：会用终端、需要在多个 API key / provider / profile 之间切换的开发者
- **次要**：CI 流水线（`doctor --json` / `probe --json` / `profile-diff --json` / `bench --json`）

不是给完全不会终端的新手；不是给只用一个 key 一次配好就不动的人。

---

## 2. 主路径（5 分钟）

`setup → code → validate → recover → deliver`

| 阶段 | 命令 | 备注 |
|---|---|---|
| setup | `ccjk onboard` → `ccjk init` | 首次走向导；后续直接 init |
| code | （无需 ccjk 介入） | 用户用 Claude Code / Clavue / Codex 自身写代码 |
| validate | `ccjk doctor` / `ccjk probe` / `ccjk bench` | 静态体检 / 实际探活 / 性能基准 |
| recover | `ccjk rollback` / `ccjk doctor --fix` | 任何写盘前都已自动备份 |
| deliver | `ccjk profile export` / `ccjk migrate` | 跨机器迁移；从已有 settings 反向纳入管理 |

详细流程见 `docs/QUICKSTART.md`。

---

## 3. 产品边界（不做清单）

ccjk 是**配置工具**，不是 IDE 也不是 agent runtime。明确不做：

- ❌ 不主动写代码
- ❌ 不装 hooks
- ❌ 不开后台进程 / 守护进程
- ❌ 不修改 Claude / Clavue / Codex 自身的运行时行为
- ❌ 单向：`settings.json → profile`（`migrate`），不反向覆盖 settings
- ❌ 不在 Claude / Clavue 的 runtime 里偷偷调 ccjk 命令（reentrancy）

这条边界保证：用户随时可以卸了 ccjk 而不影响四个工具（Clavue / Claude Code / Codex / Grok）的正常使用。

---

## 4. 默认体验承诺

| 承诺 | 来源 / 落地版本 |
|---|---|
| 任何子菜单 ESC/Ctrl+C 必须**静默回菜单**（不报红字） | v15.27.1 |
| `ccjk doctor` exit code: clean=0 / warn=1 / error=2 | v15.25 |
| `ccjk use <profile>` 默认同步全部已装工具（clavue + claude-code + codex） | v15.21 |
| 任何破坏性写操作前都自动备份；`ccjk rollback` 可恢复 | 自始至终 |
| codex profile 信息走 `[profiles.<name>]` 段，不锁顶层 model | v15.20 |
| 提示语区分两种「无 profile」：完全空 → init；手配过 settings → migrate | v15.27.1 |

---

## 5. provider 收录策略

`src/core/providers.ts` 里的 catalog 是**已知能跑通的厂商**：

- 国内：GLM / Kimi / MiniMax / DeepSeek
- 海外：Anthropic 官方 / OpenRouter
- 兼容：GPT 网关（OpenAI 兼容）/ 自定义网关

每条 provider 必有：`baseUrl` / `hint` / `docsUrl`（v15.26 后强制）。

新增 provider 的判断：（a）有真实用户在用；（b）能通过 `ccjk probe` 拿到 200。光是「兼容 anthropic API」不算理由。

---

## 6. 路线图锚点

详见 `docs/HARDENING-ROADMAP.md`。本文件不重复路线图——它每周变；本文件应该一年改动不超过 5 次。

---

## 7. 何时改本文件

- 新增 / 退役 一条「默认体验承诺」（第 4 节）
- 收紧 / 放宽 产品边界（第 3 节）
- 主路径阶段语义变化（第 2 节）

不需要改的情形：
- 加新命令（看 README + CHANGELOG）
- 修 bug（看 CHANGELOG）
- 加新 provider（看 catalog）
- 重构内部代码（看 ARCHITECTURE.md）
