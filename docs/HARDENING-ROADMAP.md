# ccjk 加固路线图 — 让它成为 Clavue / Claude Code / Codex 的完美伴侣

> 三人讨论视角：
> - **Karpathy**：少废话、可验证、最小可用、能 dogfood
> - **Musk**：删比加更难。删到不能再删，再加回必要的 10%
> - **张一鸣**：用户没说出口的 pain 才是真 pain；功能要服务于"用户做出选择的 5 秒钟"

本文是看板，不是承诺。每一项都有"成功标准"——能 `pnpm test` 验证才算落地。

---

## 已落地（v15.20 → v15.24）

| 版本 | 改动 | 来源 |
|---|---|---|
| v15.20 | codex profile 写入用 `[profiles.<name>]` 而非顶层 model | 用户反馈"单 model 反人性" |
| v15.21 | `ccjk use` 同步切 codex 配置 | 跨工具体验断层 |
| v15.22 | doctor 接入 codex toml 的 3 条脏数据规则 | 用户真实 config.toml 污染 |
| v15.23 | init 默认 simple 单 model，advanced 才 4 槽 | "强行问 4 次"反人性 |
| v15.24 | doctor 新增 3 条 settings.json env 卫生规则 | 用户文件里 3 个非官方 env |

---

## 现状诊断（卡帕西视角：先承认问题）

跑用户真实环境的 `ccjk doctor` 还能命中 **2 errors + 8 warnings**。这意味着：

1. **配置污染是常态，不是异常。** 用户从论坛/教程复制各种 env 进 settings.json，从来没人审过。
2. **doctor 是被动工具。** 用户得先知道要跑它。绝大多数人不会。
3. **init 仍可能产生污染。** 当 provider 文档里写的字段名 ccjk 不识别时，我们应该 warn，而不是默默写入。
4. **profile 不可移植。** 团队/多机用户的核心需求是"我这套能不能给同事/给我自己的 mac mini"。

---

## P0 — 必须做（命中"用户做出选择的 5 秒钟"）

### P0-1. 首次运行 onboarding 向导
- **问题**：新用户跑 `ccjk` 看到一堆菜单，不知道从哪进。
- **方案**：检测 `~/.ccjk/profiles/` 为空时，进入 5 步线性向导：
  1. 选工具（Clavue / Claude Code / Codex / 全装）
  2. 选 provider（带 hint：官方 / 国内常用 / 自定义）
  3. 填 base_url + key（粘贴板自动识别）
  4. 选 model 策略（单 model / 分级）
  5. 取 profile 名（默认建议）→ 一键写入
- **成功标准**：从 `npm i -g ccjk` 到 `clavue` 能跑通，总按键数 ≤ 10。
- **测试**：`init.test.ts` 加 `should auto-enter onboarding when no profiles exist`。

### P0-2. doctor 自动在 init 后跑一次
- **问题**：用户新装/迁移完不知道自己的 settings.json 已经有污染。
- **方案**：`init` 写完 settings 后，自动 invoke `lintSettings`，有 finding 就显示 `运行 ccjk doctor --fix 清理`。
- **成功标准**：commit 后 `node dist/cli.js init ...` 末尾出现 finding 摘要。
- **风险**：别让 doctor 自动 fix 别人的 settings——只提示。

### P0-3. profile 导出/导入（团队分享 + 多机同步）
- **问题**：用户有 5 台 mac / 团队 8 人，配置只能手抄。
- **方案**：
  - `ccjk profile export <name> > my.ccjk-profile.json` —— 含 provider / baseUrl / model 槽，**不含 key**（key 走环境变量名指针）。
  - `ccjk profile import my.ccjk-profile.json` —— 导入后提示设置对应 env 取 key。
  - 格式版本号 v1，向前兼容用 jsonschema。
- **成功标准**：profile pack 测试覆盖 export/import 往返一致性。
- **测试**：`profile-pack.test.ts` 加 roundtrip 用例。

---

## P1 — 应该做（提升日常体验）

### P1-1. 三工具状态对比面板
- **场景**：用户问"我现在 Clavue 跑哪个 provider？Codex 跑哪个？"
- **方案**：`ccjk status` 输出一张表（Tool / Profile / Provider / BaseURL / Model / 健康），三列对齐。
- **成功标准**：`ccjk status` 一屏内显示全部三个工具状态 + 异常红字。

### P1-2. provider catalog 内置常见国内/海外网关
- **问题**：用户每次填 base_url 都得翻文档。
- **方案**：`providers.ts` 扩成 catalog（OpenRouter / DeepSeek / GLM / Anthropic 官方 / 自定义）。每个 catalog 项带 `recommendedModels` + `docsUrl`。
- **风险**：catalog 易过期。约束：只放官方文档明确支持 ANTHROPIC_BASE_URL 协议的。

### P1-3. doctor --json 输出 + exit code 矩阵
- **场景**：CI 跑 doctor，团队管控配置 drift。
- **方案**：`ccjk doctor --json` 返回结构化 finding 数组；exit code: 0=clean / 1=warn / 2=error。
- **成功标准**：能写一个 1 行 shell 在 CI 卡住有 error 的 PR。

### P1-4. profile 健康徽章 + lastUsedAt
- **场景**：用户切了一堆 profile 不记得哪个还能用。
- **方案**：每次 `ccjk use <name>` 记录 `lastUsedAt`；`ccjk list` 显示 `✓ healthy / ! stale / ✗ broken`。
- **成功标准**：`ccjk list` 每行末尾有状态徽章。

---

## P2 — 看心情做（远期收益）

### P2-1. cost / token 自统计
- 解析 Claude Code/Clavue 的 jsonl 日志，按 profile 聚合 token 用量。
- 风险：日志格式不稳定，先做 Clavue。

### P2-2. MCP server marketplace
- `ccjk mcp add <slug>` 一键装常用 mcp（github / postgres / filesystem）。
- 已有基础（`commands/mcp.ts`），缺 curated catalog。

### P2-3. 跨机器同步（gist / 私 git）
- profile pack + key 加密（age / sops）后推到用户私 repo。
- 安全门槛高，慢做。

---

## 不做（卡帕西法则：删比加更难）

| 想法 | 为什么不做 |
|---|---|
| GUI / Electron 应用 | CLI 已经够快，加 GUI 是 10× 维护成本换 0.5× 价值 |
| AI agent 自动配 provider | 用户根本不信任 LLM 帮他填 API key |
| 自家 cloud sync | 我们不存用户 key，不做服务端 |
| 自定义 hook 系统 | Claude Code 已有；不要 reinvent |
| 给每个 provider 写适配器 | 协议层只有 anthropic-compatible 一种值得做 |

---

## 工程纪律（每条都不可妥协）

1. **新功能必带测试**：lint.test.ts 是范例——250 tests 全过才能 merge。
2. **不引入新依赖**：当前 4 个 prod 依赖（inquirer / ansis / commander / string-width），加任何新的需要 issue + ADR。
3. **不改 settings 不备份**：每次 writeSettings 留 `.bak.<timestamp>`。
4. **错误信息可执行**：finding 必带 `fixHint`；告诉用户下一步键入什么。
5. **CLI 一屏可读**：默认输出 ≤ 24 行；用 `--verbose` 开详细。

---

## 节奏（张一鸣视角：节奏比单点重要）

- **每周一发**：周五跑 doctor + smoke + publish；版本号永远 patch / minor，不 break。
- **每月对账**：审 `~/.claude/settings.json` 真实样本，看 doctor 还漏没漏。
- **季度盘点**：跑用户调研——3 个问题：你最常用哪个命令？最讨厌哪步？最希望加什么？

---

## 下一批要做的（P0 三件，按顺序）

1. **profile export/import**（无新增 UI，纯函数 + 命令，可独立测试 → 1 天）
2. **init 自动调用 doctor**（5 行代码，但需要测试 e2e → 半天）
3. **首次运行 onboarding**（涉及 UX 决策，需要先写文档讨论 → 2 天）

按这个顺序：1 风险最低先发，2 顺带验证 doctor 的真实价值，3 留给下一个版本周期。
