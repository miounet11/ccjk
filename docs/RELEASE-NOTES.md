# ccjk Release Notes（v15.20 – v15.26）

每个 release 都已发到 npm latest 并打了 git tag。本文是给 GitHub Releases 用的精简版，完整变更看 [CHANGELOG.md](../CHANGELOG.md)。

---

## v15.26.0 — 探活 / 反向导入 / 对比

`ccjk probe`、`ccjk migrate`、`ccjk profile-diff` 三个新命令，加上 provider catalog 元数据（docsUrl / hint / region）。

**新命令**
- `ccjk probe [profile]` — 真实 HTTP 探活当前/指定 profile。状态分 ok / auth-failed / unreachable / unexpected。`--json` 输出延迟和状态码。
- `ccjk migrate` — 把已经存在的 `~/.claude/settings.json` 反向导入成 ccjk profile。不动 settings 本身。
- `ccjk profile-diff <a> <b>` — 两个 profile 字段对比，identical exit 0，有差异 exit 1。`--json` 输出结构化 diff。

**改进**
- provider catalog 加 OpenRouter / DeepSeek。每条 provider 补 hint 和 docsUrl。

测试 273 → 301（+28）。

---

## v15.25.0 — doctor JSON / 首次向导 / profile 健康

四件事一起发：CI 集成（doctor --json）、新用户体验（onboard）、profile 状态可视化（健康徽章）、加固体检（+2 lint 规则）。

**新命令**
- `ccjk doctor --json` — 结构化 JSON 输出 + 新 exit code 矩阵（clean=0 / warn=1 / error=2）。
- `ccjk onboard [--force]` — 首次运行向导：检测 profile 为空时自动 init + doctor。

**改进**
- `ccjk profile` 列表显示健康徽章：✓ healthy / ! stale (>90d) / ✗ broken。
- `ccjk use` 自动写 lastUsedAt。
- `ccjk init` 写完 settings 自动 lint 并提示 `ccjk doctor --fix`。
- doctor 新增 2 条规则：`apiKeyHelper-stale`、`bash-permissions-too-broad`。

**Breaking change（小）**
- doctor exit code 行为变更：之前 warn 也是 0，现在 warn = 1。如果你在 CI 里 `ccjk doctor || true` 跳过，行为不变；如果你显式 check `$? == 0`，需要改成 `<= 1`。

测试 250 → 273（+23）。

---

## v15.24.0 — settings.json env 卫生

doctor 新增 3 条 settings.json env 卫生规则。基于真实用户 `~/.clavue/settings.json` 污染样本设计。

**新规则**
- `deprecated-env` — 识别 `ANTHROPIC_SMALL_FAST_MODEL` / `ANTHROPIC_CUSTOM_MODEL_OPTION` / `CLAUDE_CODE_SUBAGENT_MODEL` 等已弃用或第三方私有字段，可自动修。
- `unknown-anthropic-env` — 未知 `ANTHROPIC_*` / `CLAUDE_CODE_*` env 提示（info 级，不自动修）。
- `redundant-model-slots` — 4 个 model 槽全同值时建议只留 ANTHROPIC_MODEL，可自动修。

内置 KNOWN_ENV 白名单（~25 个官方字段）+ KNOWN_BAD_ENV 黑名单 Map。

---

## v15.23.0 — init 单 model 优先

`ccjk init` 默认走 simple 单 model 流程；4 槽位降为 advanced 选项。

**Why**
旧行为强制问 4 次（main/haiku/sonnet/opus），多数用户填重复值。新交互 80% 场景一键过。

---

## v15.22.0 — codex toml 体检

doctor 接入 `~/.codex/config.toml` lint，3 条规则：

- `codex-provider-model-field` — `[model_providers.X].model` 是非法字段（codex 静默忽略），可自动修。
- `codex-stale-wire-api` — `wire_api = "chat"` 已弃用，建议改 `"responses"`，可自动修。
- `codex-toplevel-model-without-profile` — 顶层 `model` 没有 `profile` 时提示搬到 `[profiles.<name>]`。

---

## v15.21.0 — `ccjk use` 同步 codex

`ccjk use <name>` 切换 profile 时同步更新 codex 配置（写入 `[profiles.<name>]`），不再只动 Claude / Clavue 一侧。

---

## v15.20.0 — codex profile 段写入

codex `init` 改用 `[profiles.<name>]` 段写入 model 信息，不再锁定顶层 `model = "..."`。

**Why**
顶层 model 锁定让"多 model 并存"反直觉。`[profiles.<name>]` 才是 codex 官方推荐姿势——用户可以随时 `codex --profile <other>` 切到别的 model。

---

## 升级建议

```bash
npm install -g ccjk@latest
ccjk doctor       # 体检现有配置
ccjk doctor --fix # 自动清理
```

发现配置 drift？运行 `ccjk migrate` 把现有 settings.json 反向导入为 profile。
