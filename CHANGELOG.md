# Changelog

ccjk 是 Clavue / Claude Code / Codex 的本地配置 CLI。本文记录用户可见的行为变化，不记录纯重构。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [Unreleased]

## [15.26.0] - 2026-05-25

### Added
- `ccjk probe [profile]`：真实 HTTP 探活，区分 ok / auth-failed / unreachable / unexpected
  - exit code: ok=0、auth-failed=1、unreachable=2、unexpected=3
  - `--json` 输出延迟 / 状态码 / error 详情，CI 友好
- `ccjk migrate`：反向导入已存在的 `settings.json` 为 ccjk profile
  - 从 env 抽 baseUrl / 凭证 / 4 槽位 model
  - 通过 hostname 反向匹配 provider catalog；找不到落 `custom`
  - 不修改 settings.json 本身（单向：settings → profile）
- `ccjk profile-diff <a> <b>`：对比两个 profile 字段差异
  - 默认彩色表格高亮不同字段
  - `--json` 输出结构化 diff，identical=true 时 exit 0；有差异 exit 1
- provider catalog 元数据扩展：`docsUrl` / `hint` / `region`
  - 新增 OpenRouter / DeepSeek（之前没收录）
  - 已收录的 anthropic / glm / kimi / minimax / custom 全部补齐 hint+docsUrl

### Internal
- 测试基线 273 → 301（+28 用例 / 25 文件）
- 4 个并行 worker 完成 doctor-json / onboarding / profile-health / lint-extra（v15.25）
- 4 个并行 worker 完成 probe / migrate / provider-catalog / profile-diff（本批，其中 1 个 worker 异常退出，由协调器接手 migrate 实现）

## [15.25.0] - 2026-05-25

### Added
- `ccjk doctor --json`：结构化输出 + schemaVersion + 完整 finding 列表，便于 CI 集成
- `ccjk onboard [--force]`：首次运行向导，无 profile 时自动 init + doctor 一气呵成
- `ccjk profile list` 显示健康徽章：✓ healthy / ! stale / ✗ broken（lastUsedAt > 90 天为 stale）
- `ccjk use <name>` 切 profile 时自动写 lastUsedAt
- doctor 新增 2 条 settings.json 规则：
  - `apiKeyHelper-stale`：检测路径含 Windows 反斜杠或未展开 `$HOME`
  - `bash-permissions-too-broad`：检测 `permissions.allow` 含 `Bash(*)` / `curl+sh` 等过宽通配
- `ccjk init` 写完 settings 后自动跑 lint，提示用户如何 `ccjk doctor --fix`

### Changed
- doctor exit code 矩阵收紧：clean=0、warn=1（**新行为**，之前 0）、error=2

### Internal
- 测试基线 250 → 273（+23 用例）
- `docs/HARDENING-ROADMAP.md`：完整加固路线图（P0/P1/P2 + 不做清单）

## [15.24.0] - 2026-05-25

### Added
- doctor 新增 3 条 settings.json env 卫生规则
  - `deprecated-env`：识别已弃用 / 第三方私有字段（`ANTHROPIC_SMALL_FAST_MODEL`、`ANTHROPIC_CUSTOM_MODEL_OPTION`、`CLAUDE_CODE_SUBAGENT_MODEL`），可自动修
  - `unknown-anthropic-env`：未知 `ANTHROPIC_*` / `CLAUDE_CODE_*` env 提示（info 级，不自动修）
  - `redundant-model-slots`：4 个 model 槽全同值时建议只留 `ANTHROPIC_MODEL`，可自动修
- `lint.ts` 内置 KNOWN_ENV 白名单（~25 个官方字段）+ KNOWN_BAD_ENV 黑名单 Map（带每条原因解释）

## [15.23.0] - 2026-05-25

### Changed
- `ccjk init` 默认进入 simple 单 model 模式；4 槽位（main/haiku/sonnet/opus）降为 advanced 选项
- 旧行为强制问 4 次模型 ID，多数用户填重复值；新交互让 80% 场景一键过

## [15.22.0] - 2026-05-25

### Added
- doctor 接入 codex `~/.codex/config.toml` lint，3 条规则：
  - `codex-provider-model-field`：`[model_providers.X].model` 是非法字段（codex 静默忽略），可自动修
  - `codex-stale-wire-api`：`wire_api = "chat"` 已弃用，建议改 `"responses"`，可自动修
  - `codex-toplevel-model-without-profile`：顶层 `model` 没有 `profile` 时提示搬到 `[profiles.<name>]`

## [15.21.0] - 2026-05-25

### Changed
- `ccjk use <name>` 切换 profile 时同步更新 codex 配置（写入 `[profiles.<name>]`），不再只动 Claude/Clavue 一侧

## [15.20.0] - 2026-05-25

### Changed
- codex `init` 改用 `[profiles.<name>]` 段写入 model 信息，不再锁定顶层 `model = "..."` 字段
- 用户可随时 `codex --profile <other>` 切换其它 profile，多套 model 并存

### Why
- 顶层 model 锁定让"多 model 并存"反直觉；profile 段才是 codex 官方推荐姿势

---

完整提交记录见 `git log`。
