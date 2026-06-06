# Changelog

ccjk 是 Clavue / Claude Code / Codex 的本地配置 CLI。本文记录用户可见的行为变化，不记录纯重构。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [Unreleased]

## [16.0.2] - 2026-06-06

### Added
- 首次引导：先选显示语言，再选 Clavue / Claude Code / Codex / Grok CLI
- Clavue 专用控制中心菜单（设置、更新、API、MCP、模型、记忆、权限、探活）
- `runtime-settings` / `claude-settings-normalizer`：按工具路由 `~/.clavue` 与 `~/.claude`

### Changed
- Clavue 配置全流程写入 `~/.clavue`（不再误写 `~/.claude`）
- 配置 API/模型/记忆/MCP/工作流/权限的界面文案按当前工具显示（Clavue 不再显示 Claude Code 文案）
- Clavue init 检测并安装 `clavue` CLI，跳过 Claude Code 安装逻辑
- Profile 应用、环境变量导入、输出风格等均按活动工具选择目标路径

## [16.0.1] - 2026-06-03

### Added
- `ccjk reasonix`：Reasonix CLI 状态探测与启动指引（DeepSeek 原生 agent 伴侣）
- `ccjk reasonix <profile>`：从 ccjk profile 注入 API key 并启动；无 `reasonix.toml` 时自动生成最小配置
- 主菜单「其他工具」新增 `X.` Reasonix 入口

### Changed
- 全面剔除 ZCF 品牌引用，统一为 ccjk（`CcjkUninstaller`、文案、文档）
- 配置目录 canonical 路径：`~/.ccjk/config.toml`

### Internal
- ZCF 基座重建合并为 16.x 正式线；`zcf-config` 测试重命名为 `ccjk-config`

## [16.0.0-alpha.3] - 2026-06-03

### Added
- `ccjk reasonix`：Reasonix CLI 状态探测与启动指引（DeepSeek 原生 agent 伴侣，非 runtime 嵌入）
- `ccjk reasonix <profile>`：从 `~/.ccjk/profiles` 注入 `DEEPSEEK_API_KEY` / `MIMO_API_KEY` 并启动 `reasonix chat`
- 项目根无 `reasonix.toml` 时，从 profile 自动生成最小配置（不覆盖已有文件）
- `--run` / `-p` 支持单次 `reasonix run`；`--no-sync` 跳过 toml 生成
- 主菜单「其他工具」新增 `X.` Reasonix 入口

### Internal
- 新增 `src/utils/reasonix-config.ts`、`src/commands/reasonix.ts`
- 新增 `tests/utils/reasonix-config.test.ts`（7 case）

## [15.27.6] - 2026-05-26

### Added
- `ccjk status` 工具配置对比表加 drift badge：当 `process.env.ANTHROPIC_BASE_URL` /
  `ANTHROPIC_MODEL` 与该工具 settings.json 对应字段不一致时，列前加黄色 `!`
- 表底部新增一行 hint：`shell rc 已 export 同名 env，shadow 了文件配置 — 跑 ccjk doctor 看详情`
- 接续 v15.27.5：doctor 已能检测 shell shadow，status 现在每次都会主动暴露这个事实

### Internal
- 测试基线 335 → 338（+3：status drift badge 3 case）

## [15.27.5] - 2026-05-25

### Added
- `ccjk doctor` 新增 `[Runtime] shell environment` 段：检测 shell rc 残留 env shadow 文件配置
  - **shell-env-shadow**（warn）：`process.env.X` 与所有 `settings.env.X` 都不一致时报警；
    Claude Code 启动优先读 shell，文件配置完全失效——这是「切了 profile 没生效」的头号黑洞
  - **shell-env-deprecated-export**（info）：shell 在 export 已知坏 env（`ANTHROPIC_SMALL_FAST_MODEL` /
    `ANTHROPIC_CUSTOM_MODEL_OPTION` / `CLAUDE_CODE_SUBAGENT_MODEL`）
  - **shell-env-orphan**（info）：shell 有 baseUrl/凭证但无任何 settings 文件，建议 `ccjk migrate`
- `ccjk doctor --json` schema 新增 `runtime.findings[]` 字段（schemaVersion 不变）；warn 计入 summary

### Internal
- 新增 `src/core/runtime-env.ts`：纯函数 `inspectRuntimeEnv()`，无 IO，便于测试
- 测试基线 325 → 335（+10：runtime-env 8、doctor-json 2）

## [15.27.4] - 2026-05-25

### Fixed
- `ccjk onboard` 老用户路径：之前已有 profile 时静默退出，用户跑了命令却没任何反馈
  - 现在打印「已有 N 个 profile，跳过向导」+ 提示 `--force` / `ccjk` 进菜单
  - onboard 测试覆盖该提示

## [15.27.3] - 2026-05-25

### Changed
- `ccjk perms-show` 改横向单行布局：每工具一行（工具名 / 档位 / 详情 inline）
  - 之前是「标题 + 缩进 dim 详情」两行，三工具要扫 6 行才能比对
  - 现在和 `ccjk status` 的「权限档位」段视觉一致

### Internal
- 测试基线 323 → 325（+2 用例覆盖 perms-show 布局回归）

## [15.27.2] - 2026-05-25

### Fixed
- `ccjk --help` 顶层描述补上 Codex（之前写「Clavue / Claude Code 配置 CLI」，遗漏了 v15.20 后已经一等公民化的 Codex）
- menu「切换 Profile」hint 同步范围补上 Codex

## [15.27.1] - 2026-05-25

### Fixed
- `ccjk menu`：用户在子菜单按 Ctrl+C / ESC 取消时不再误报红色「执行失败」，改为静默回主菜单
  - 顶层 `cli.ts` 早就识别 `ExitPromptError`，菜单内层 catch 没跟上 — 修复后菜单循环 `continue` 直接进入下一轮
  - 新增 `isExitPromptCancellation()` 纯函数 + 4 个微测
- `ccjk status` Profile 段：手配过 `settings.json` 但没纳入 ccjk 管理时，提示从「运行 `ccjk init`」改为「运行 `ccjk migrate` 反向导入」
  - 之前的提示对已经手配的用户是误导

### Internal
- 测试基线 317 → 323（+6：menu 4、status 2）

## [15.27.0] - 2026-05-25

### Added
- `ccjk bench [profile]`：真实性能基准，流式调用 `/v1/messages` 测 TTFT / 总耗时 / 吞吐
  - 默认 3 run 取平均（`--runs 1..10` 可调）
  - `--json` 输出结构化结果（含每 run 详情 + avg），失败 run 不计入平均
  - 全部失败 → exit 1；和 `probe`（看通不通）互补，`bench` 看快不快
- `docs/QUICKSTART.md`：5 分钟上手文档（profile / use / doctor / probe / migrate / 最常见 30 秒流程）

### Changed
- `ccjk status` 重写为横向对比表：Clavue / Claude Code / Codex 三工具一屏对照（profile / baseUrl / model / 健康 / 权限档位 / 版本）
  - 之前是分段纵向输出，需要滚屏比对
  - 健康徽章：✓ healthy / ! warn / ✗ broken / – unknown
- `ccjk menu` 接入新命令：
  - "开始使用"组末尾加"从现有 settings 导入"（`migrate`）
  - 维护组加 `probe` / `profile-diff`（两段选择交互）/ `onboard --force`

### Internal
- 测试基线 301 → 317（+16 用例：bench 11、status 5）

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
