# Changelog

ccjk 是 Clavue / Claude Code / Codex 的本地配置 CLI。本文记录用户可见的行为变化，不记录纯重构。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [17.2.0] - 2026-10-27

### Added
- **本机控制台观测面板**：`ccjk ui` 新增「日志」页，列出每次经过本机的请求（时间、服务商、模型、状态、耗时），可按服务商筛选或只看失败；新增「选路」页，按时间线显示一次请求依次试过哪几家、为什么换下一家。后端相应新增 `GET /api/logs` 与 `GET /api/decisions`，转发时记录每次上游尝试。
- **用量按维度拆分**：用量页支持今天 / 7 天 / 30 天 / 全部切换，按服务商、按模型、按账号分别统计，并附一条趋势线。
- **快速跳转与中英切换**：`⌘K` / `Ctrl+K` 打开命令面板，可搜页面和模型；界面内可切换中英文，选择记在本机。
- 界面加载态改为骨架屏，新增设计 token 与统一的工具栏、标签、时间线组件。

### Changed
- **对外介绍重做**：README 拆成英文主入口 `README.md` 和中文详版 `README.zh-CN.md`，两份顶部互链；首屏加入 `docs/assets/architecture.svg` 架构示意图；补全 6 个客户端工具、28 个服务商预设、5 种协议、3 种路由的说明。宣传页 `site/index.html` 同步。英文版补齐「医生与操作员 / 多语言 / 常见场景 / CLI 命令 / 设计原则」五节，与中文版结构对齐。
- **README 在 npm 上可用**：架构图与文档链接原先用相对路径，而 `docs/` 和 `site/` 不随 npm 包发布，在 npmjs.com 上是裂图和 404。图片改用 `raw.githubusercontent.com` 绝对地址，其余链接改为 `github.com/.../blob/main/`。
- **npm 描述改为英文优先**：`package.json` 的 `description` 原为中文长句，改为英文短句并保留三语说明。
- 公开仓根目录不再保留空壳 `setup-report-*.md` 与内部审计报告，已加入 `.gitignore`。

### Security
- 移出 `docs/.vitepress/v8-implementation-summary.md`：含内部服务器路径，且已随公开仓暴露。已加入 `.gitignore`。

### Fixed
- **控制台卡在「正在打开…」**：`ui-page.ts` 里 `parseRoute` 的正则藏在模板字符串中，`\/` 被转义成 `/`，下发到浏览器的正则因此非法，整个脚本在启动时抛 `SyntaxError`，页面只剩加载文案。改为字符串切片解析，不再依赖正则转义。
- `ccjk proxy start` 和 `ccjk ui` 后台拉起时会带上当前 Node 的启动参数。用 TypeScript 入口时，以前会打印已启动，服务却马上退出。

### Changed
- 写入客户端配置时，只要带了模型就会改写那个工具的默认模型（以前只在聚合模式下写）。点「用这个」或 `proxy use` 会带模型；「使用这家」不带就不写。

### Added
- 界面主路径改为按「服务商 / 模型」点「用这个」。`ccjk proxy use --tool <工具> --model <服务商>/<模型>` 一步写入。
- 经过本机时可以按顺序、轮流，或先用得少的换上游。同一段对话在上游还健康时继续用同一家。
- 可以从本机 Claude、Codex、Grok 配置导入地址（跳过 127.0.0.1 / localhost），可以向服务商拉取模型列表，拉失败就留着原来的。
- 思考内容会跟着协议转换走，OpenAI 的 `reasoning_content` 会变成 Anthropic 的 thinking。
- 配置档 `ccjk proxy save/load --name`，模型别名，转发前的补充说明，参考价和缓存命中，以及每家可选的 HTTP 出站代理。

## [17.1.0] - 2026-10-12

### Added
- **本机代理与界面**：`ccjk proxy` 在 127.0.0.1 上转发请求，支持直连 / 路由 / 聚合、五种协议互转、熔断故障转移、聚合模型前缀，以及 `ccjk ui` 完整界面。
- `ccjk proxy apply` / `revert` 把代理地址写入 Claude Code、Clavue、Codex、Grok、OpenCode、ClaudeWork，并按第一次快照还原。
- 账号槽只保存用户自己的凭证（本机加密），界面标明官方客户端之外使用订阅可能违反厂商条款。不冒充官方客户端。

### Changed
- **本机界面**：侧边栏按工具切换。分段只预览，点「使用这家」才写入该工具；路由和聚合走 `/t/<工具>`，各工具互不影响。直接连接写服务商自己的地址。文案改为日常说法。
- **界面手感与状态**：工具页的搜索与三档切换改为局部重绘，不再整页刷新，中文输入法不再被打断；写入期间按钮置灰，避免重复点击。侧边栏显示代理是否在跑（每 5 秒回看 `/api/health`）。
- **服务商与账号管理**：已添加的服务商可就地改显示名称、换密钥、清除密钥，并标出「哪些工具正在用」；移除服务商后提示仍指向它的工具。账号可改备注、余额地址与令牌，缺少余额地址的会标出来。已添加的服务商在预设列表里显示「已添加」，不会重复添加。
- **可访问性与窄屏**：三档切换改为标准 tablist（方向键可切、焦点可见），搜索框补了无障碍标签，暗色模式下补了对比度与焦点态。

### Fixed
- `ccjk proxy apply` 的直连模式此前会被写成 `/t/<工具>`，现在按每个工具已保存的接法写入服务商自己的地址。
- 删除账号后 `proxy-accounts.json` 权限回落为默认 umask，现在与写入时一致保持仅本人可读。
- CI 冒烟测试对齐实际产物入口 `dist/cli.mjs`，并改为校验真实存在的 `proxy` / `provider` 子命令（此前引用的 `dist/cli.js` 与已移除的 `status` / `completion` 命令会让 PR 检查必失败）。

## [16.4.0] - 2026-10-09

### Added
- **外部客户端轻量接入**：新增 `ccjk pi` / `ccjk opencode` / `ccjk zcode` / `ccjk grokbuild` / `ccjk claudework` / `ccjk extclients` 命令，覆盖 pi、OpenCode、ZCode、Grok Build、ClaudeWork 五个客户端；`~/.ccjk` profile 以 `OPENAI_*` / `ANTHROPIC_*` 环境变量注入启动，OpenCode 额外支持直接写入 `opencode.json` provider（写前自动备份）
- **日语语言包**：新增 `ja` 全量翻译（57 个 i18n 文件），CLI 现支持 zh-CN / en / ja 三语言
- 主菜单跨工具分区新增「其他客户端」入口，一键查看外部客户端安装状态与启动用法

### Changed
- **三语言菜单文案按 Don't Make Me Think 重写**：医生中心→环境体检、操作员→常用设置、完整初始化→一键初始化；每个选项描述改为「做了会发生什么」的日常说法；新增首次使用引导（W 向导 / H 体检）
- `ccjk config-switch --list` 对暂无专属列表的工具（clavue / grok）给出明确指向，不再静默退出；空 profile 提示补充下一步动作

### Fixed
- `ccjk probe` / `ccjk bench` 在未配置 API 时优雅提示并返回退出码 4（JSON 模式输出 `missing-config`），不再抛出未捕获异常
- Grok 菜单布局测试与 `defaultModel` 类型错误对齐实际实现

### Test
- 全量套件 2595/2595 通过；onboarding 与 npm-pack 测试改为临时目录 + 私有 npm 缓存，不再依赖真实用户目录（沙箱 / CI 环境可稳定运行）

## [16.3.1] - 2026-07-22

### Fixed
- 对齐 Grok CLI 能力矩阵与真实 operator 分发：暂不暴露未实现的 API / MCP / AI memory / workflow 入口。
- Grok 初始化不再误调用 Claude family incremental manager，仅切换 ccjk 活动工具并显示 Grok 启动提示。

### Changed
- Grok 菜单收敛为当前具备闭环的 profile / status / default model 配置路径。

## [16.3.0] - 2026-06-21

### Added
- **Clavue 9.x 组合模型支持**：`ccjk init --code-type clavue` 自动创建 provider profile（`~/.clavue/.clavue.json` + `.credentials.json`），支持 9 槽 modelRouting
- **`ccjk provider` 命令**：list / current / validate 管理 Clavue provider profiles
- Provider profile 单元测试（35 用例）

### Changed
- PRODUCT.md 定位更新为"全访问加强 zero-config 工具"
- ARCHITECTURE.md 修复过时 `src/core/` 引用，更新为实际 `src/utils/` 结构
- API/模型配置同步写入 provider profile（Clavue 9.x），不预设 modelMode 默认值

### Removed
- 删除 `IMPLEMENTATION_SUMMARY.md`（记录已移除的 Gastown 多 agent 系统）
- 删除未使用的 `CLAVUE_MODEL_ROUTING_SLOTS` 导出

### Internal
- 新增 `src/utils/clavue-provider-profile.ts`：provider profile 管理器
- 新增 `src/commands/provider.ts`：provider 管理命令
- 新增 `docs/ccjk-audit-2026-06-21.md`：全量审计报告

## [16.2.1] - 2026-06-10

### Fixed
- `ccjk probe --json` / `ccjk bench --json` 在未设置显示语言时不再弹出语言选择，便于非交互诊断 API/代理错误。

## [16.2.0] - 2026-06-09

### Added
- **Codex 多端运行时**：`src/utils/codex-runtime.ts` 检测 CLI / 桌面 App / IDE 扩展（三者共用 `CODEX_HOME` / `~/.codex`）
- `resolveCodexHome()`：尊重 `CODEX_HOME` 环境变量
- 医生扫描报告新增「Codex 运行时」与「配置风险」段（第三方 provider + `features.goals` / `multi_agent` 预警）
- 操作员写入后提示：桌面 App 需完全退出重开以加载新配置

### Changed
- 工具矩阵与菜单文案：Codex 显示为「CLI / 桌面 / IDE」共用配置
- `README.md` 重写为 v16 医生+操作员模型与当前命令集

## [16.1.0] - 2026-06-09

### Added
- **医生 + 操作员**产品模型：`src/config/tool-matrix.ts` 定义四工具能力矩阵
- `ccjk clean`：扫描并清理脏 MCP、坏 Skills、冗余 prompts、过时 `~/.codex/AGENTS.md`
  - `--purge-all`：移除所有 MCP（Codex/Claude）、Skills（Codex/Claude/Grok）、prompts
  - `-s`：非交互，仅清理高置信度项
- **Codex 初始化预设**：干净（零安装）/ 优化（baseline + 默认工作流 + context7）/ 自定义
- **医生中心**（菜单 `H`）：只读扫描报告 → API 探活 → 智能清理 → 全部清理
- **快捷向导**（菜单 `W`）：完整初始化、仅工作流、单项调整；Codex 支持「重置后初始化」
- Codex `config.toml` 嵌套 MCP 节完整删除（`[mcp_servers.*.env]` 等孤儿节）
- 工程向 Codex 输出风格与工作流模板（去掉角色扮演类）

### Changed
- 主菜单改为 **list 箭头选择**，按「操作员 / 医生 / 跨工具 / CCJK」四区分组展示
- 四工具菜单均暴露「环境清理（医生）」入口
- `PRODUCT.md` / `docs/CLAUDE-NOTES.md` 补充医生+操作员定位与交互说明

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

## [15.28.3] - 2026-05-29

### Fixed
- **`ccjk status` 的 Codex 行永远显示 `(无 profile)`**：v15.28.0 改成"不写顶层
  `profile = "..."`、只写 `[profiles.<name>]`"后，`status` 的读取逻辑没跟上——
  还在用顶层 `profile` 字段判断当前 profile，导致按新姿势配好 codex 的用户看到
  `(无 profile)` + 空 baseUrl。改成：无顶层 profile 时从 `[profiles.*]` 段自动发现，
  单个直接用，多个显示第一个 + `(+N)`（codex 靠 `--profile` 选，config 无"当前"概念）。
  顶层 `profile`（老配置/手设）仍兼容。

### Internal
- 测试基线 355 → 357（+2：codex 新姿势段发现、多 profile 的 (+N) 提示）；
  同时把 status.test.ts "全装齐"用例从已废弃的顶层 `profile` 改成新姿势，避免固化旧行为掩盖回归。

## [15.28.2] - 2026-05-28

### Fixed
- **Codex 启动报 `legacy \`profile = "..."\` config is no longer supported`**：
  ccjk 之前在 `~/.codex/config.toml` 顶层写 `profile = "<name>"` 作启动默认，
  新版 codex CLI 已把它当 legacy 直接拒绝。改用 codex 官方推荐姿势：
  - 不再写顶层 `profile`；用户用 `codex --profile <name>` 启动指定 profile
  - `applyCodexProfile` 检测到老 `profile = "..."` 行会主动删除（迁移幂等）
  - `ccjk doctor` 新增规则 `codex-legacy-toplevel-profile`（**error 级**，可
    `ccjk doctor --fix` 自动清掉）
  - `init` / `use` 完成后的提示语统一改成 `codex --profile <name>` 启动
- 旧规则 `codex-toplevel-model-without-profile` 重写为 `codex-toplevel-model`：
  顶层有 `model = "..."` 一律提示搬到 `[profiles.<name>].model`（不再因为有顶层 profile 就放过——顶层 profile 本身就是 legacy）

### Internal
- 测试基线 351 → 355（+4：legacy 顶层 profile 自动删 / lint error 规则 / autoFix 回归 / syncProfileToCodex 老配置迁移）

## [15.28.1] - 2026-05-28

### Fixed
- **Profile 不再一把刷三个工具的 settings**：`Profile` 新增 `targetTools` 字段，
  init / quick / migrate 写入时只记录"配置时选的那个工具"。`ccjk use` 切换 profile
  时只同步到 `targetTools` 列出的工具——配 codex 不再污染 clavue 的 settings。
  老 profile（无字段）保持向后兼容，默认同步到全部已装工具。
- `ccjk list` / `ccjk show` 显示作用范围：`C` / `CC` / `CX` 缩写或全名。

### Internal
- 测试基线 349 → 351（targetTools 字段往返、老 profile 兼容）

## [15.28.0] - 2026-05-28

复刻 [zcf](https://github.com/UfoMiao/zcf) 的 provider / perms / codex 设计端到端，
剔除全部第三方中转网关，三套配置（clavue / claude-code / codex）统一最简版。

### Changed
- **Provider 表瘦身**：内置 provider 只保留官方直连——`glm` / `z-ai` /
  `bailian-coding` / `minimax` / `kimi` / `deepseek` / `anthropic` / `custom`。
  删除 302.ai / Packy / Pateway / APIKEY.FUN / AICodeMirror / Crazyrouter 等
  中转网关 preset；要用走 `custom` 手填 baseUrl + key。
- **Provider 结构**：拆出 `claudeCode { baseUrl, authType, defaultModels }` 和
  `codex { baseUrl, wireApi, defaultModel }` 两套字段。同一家厂商两端 baseUrl
  不同时不再混淆。
- **Codex API key 自动落到 `~/.codex/auth.json`**：`ccjk use` 切到 codex profile
  会同时写入 `<ENV_KEY>` + `OPENAI_API_KEY` 两条；用户不再需要手动 `export`。
- **权限档位对齐 zcf 模板**：`standard` / `yolo` 改用裸 `Bash` + 全部内置工具
  裸名 + 主流 MCP 服务器名；老的 90 条 `Bash(cmd *)` 长清单删掉，靠 deny
  兜底高危命令（`rm -rf /`、`git push --force`、`sudo`、`mkfs` 等）。
- **init 流程简化**：默认一个 main model，自动填 haiku/sonnet/opus 槽位
  （不再让用户配 4 槽位策略）。

### Added
- `src/core/codex-auth.ts`：`readAuthFile` / `writeAuthFile` / `removeAuthKey`
- 启动时自动迁移老 profile：`glm-cn` → `glm`，`kimi-coding` → `kimi`，已删的
  provider id 自动回退到 `custom`（baseUrl/apiKey 保留可用，幂等回写）

### Internal
- 测试基线 343 → 349（+8：codex auth 写入、profile 迁移、新模板覆盖）

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
