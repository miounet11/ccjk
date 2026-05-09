# ccjk

> Clavue / Claude Code 配置 CLI。一条命令搞定 init、API、MCP、doctor、git 模板。

[![npm](https://img.shields.io/npm/v/ccjk.svg)](https://www.npmjs.com/package/ccjk)
[![license](https://img.shields.io/npm/l/ccjk.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/ccjk.svg)](https://nodejs.org)

## 安装

```bash
npm install -g ccjk
```

## 快速上手

```bash
ccjk                # 交互菜单
ccjk init           # 配置 API（同时存为 profile）
ccjk use            # 一键切换已配过的 API
ccjk perms standard # 一键设权限档位（同时作用于 3 个工具）
ccjk doctor --fix   # 体检并自动修复配置问题
ccjk mcp            # 装 MCP 服务（预设勾选）
ccjk mcp-ls         # 列已装的 MCP
ccjk rollback       # 从备份还原 settings.json
```

## 命令一览

| 命令 | 用途 |
|---|---|
| `ccjk` | 交互菜单（默认） |
| `ccjk init` | 配置 API：写 `~/.claude/settings.json` 的 env，并保存为 profile |
| `ccjk use [name]` | **快速切换 profile**（不带参=交互选择） |
| `ccjk profile ls/show/rm` | profile 列表 / 详情 / 删除 |
| `ccjk profile export` | **导出 profile 为 JSON 包**（迁移到其它机器） |
| `ccjk profile import <file>` | **从 JSON 包导入 profile** |
| `ccjk perms [tier]` | **一键设权限档位**（safe/standard/yolo），同时作用于 clavue/claude-code/codex |
| `ccjk perms-show` | 查看三个工具当前的权限状态 |
| `ccjk statusline-install` | **安装状态栏**：模型 / 目录 / context 用量 / 今日调用 / 速率 |
| `ccjk statusline-uninstall` | 卸载状态栏 |
| `ccjk mcp` | 选装预设 MCP 服务（交互勾选） |
| `ccjk mcp-ls` | 列出已安装的 MCP |
| `ccjk mcp-add [name]` | 添加自定义 MCP 服务 |
| `ccjk mcp-rm [name]` | 卸载 MCP 服务 |
| `ccjk doctor` | 检查 settings.json 中的常见配置问题 |
| `ccjk doctor --fix` | **自动修复**能修的问题（修改前备份） |
| `ccjk rollback` | **从备份还原** settings.json / config.toml |
| `ccjk tools` | **查看 Clavue/Claude Code/Codex 版本**（加 `--check-updates` 查最新） |
| `ccjk install [tool]` | **安装代码工具**（不带参=交互选；`--all` 装全部缺失的） |
| `ccjk update [tool]` | **更新代码工具到最新版**（不带参=交互选 outdated；`--all` 全部） |
| `ccjk detect` | 列出已安装的代码工具 |
| `ccjk git-install` | 安装 `/ccjk:git-commit` 等 slash 命令模板 |

### Profile：多 API 一键切换

```bash
ccjk init -t clavue -p glm  --api-key sk-xxx --profile work -y
ccjk init -t clavue -p kimi --api-key sk-yyy --profile free -y

ccjk use            # 交互选 work / free
ccjk use free       # 直接切到 free
ccjk profile ls     # 看当前用的是哪个
```

切换后需重启 Claude Code 才能生效（settings.json 是启动时读的）。

Profile 存储在 `~/.ccjk/profiles/<name>.json`，当前激活的记录在 `~/.ccjk/state.json`。

#### 导出 / 导入：跨机器迁移

```bash
ccjk profile export                          # 交互勾选要导出的 profile
ccjk profile export -n work free -o team.json -y  # 直接导出 work + free
ccjk profile export --redact -o template.json -y  # 抹去 API key（导出"模板"）

# 在另一台机器
ccjk profile import team.json                 # 同名时交互问跳过/覆盖/重命名
ccjk profile import team.json --conflict skip -y    # 全部 skip 已有的
```

包是简单 JSON（schema=1），可以手动编辑。带 key 的包**等同于凭证文件**，请妥善保管或用 `--redact` 导出无 key 模板再单独传 key。

### Perms：一键档位授权

一条命令把 Clavue / Claude Code / Codex 的权限同步到同一档位，减少每次操作都要点确认的烦躁。

| 档位 | 适合 | Claude/Clavue | Codex |
|---|---|---|---|
| `safe` | 浏览代码、新手 | 仅放行只读（Read/Grep/...） | `approval_policy=untrusted`, `sandbox_mode=read-only` |
| `standard`（推荐） | 日常开发 | + git/npm/pnpm/python/ls/cat 等高频命令 | `approval_policy=on-failure`, `sandbox_mode=workspace-write` |
| `yolo` | 可信项目放飞 | `Bash(*)` + `allowUnsandboxedCommands=true` | `approval_policy=never`, `sandbox_mode=workspace-write` |

不论哪一档，都强制写入 `deny`：`rm -rf /`、`git push --force`、`npm publish`、`sudo` 等不可逆 / 高危命令，避免手抖。

```bash
ccjk perms                          # 交互选档位（推荐）
ccjk perms standard                 # 直接应用 standard 到全部 3 个工具
ccjk perms safe --tools clavue,claude-code   # 只作用于这两个
ccjk perms yolo --reset             # --reset 会清空原 allow 后再写（默认是 append + dedupe）
ccjk perms-show                     # 看三个工具当前各是哪档
```

合并策略：
- `allow`：默认 append + dedupe，保护用户自定义白名单。`--reset` 强制覆盖。
- `deny`：始终覆盖，确保危险命令一定被拦。

### 非交互模式

```bash
ccjk init -t clavue -p glm --api-key sk-xxx --profile work -y
ccjk perms standard -y
ccjk mcp -s context7 serena -y
ccjk mcp-add my-server --command npx --args "-y @scope/pkg" -y
ccjk doctor --fix -y
ccjk git-install --scope user -y
```

### Doctor：体检 + 自动修复

```bash
ccjk doctor          # 列出问题，标记哪些可自动修
ccjk doctor --fix    # 自动修可修的（修改前备份）
ccjk doctor --fix -y # 跳过确认
```

可自动修复：`model-overrides-env`（删顶层 model）、`duplicate-auth`（保留 AUTH_TOKEN，删 API_KEY）。
不可自动修：`missing-credentials`、`invalid-base-url`（需要正确的 URL/Key，跑 `ccjk init`）。

### Rollback：从备份还原

每次 `init` / `mcp` / `perms` / `doctor --fix` 写入前都会自动备份到 `xxx.bak-<ISO时间戳>`。

```bash
ccjk rollback                 # 列所有备份，按时间倒序
ccjk rollback -t clavue       # 只看一个工具的备份
```

还原前会再备份一份当前状态，所以**还原本身也可还原**。

### Statusline：底部状态栏

显示模型、当前目录、context 用量、今日 API 调用次数、tokens 速率。

```bash
ccjk statusline-install        # 写入 settings.statusLine（重启 Claude Code 生效）
ccjk statusline-uninstall      # 卸载
```

效果（一行）：

```
Sonnet 4.5 1M │ 📁 ccjk │ ⚡ 4.5% 45.0k │ 12 calls · 1.5k tok/m
```

字段含义：
- `Sonnet 4.5 1M` — 模型名 + context window 大小（1M / 200k）
- `📁 ccjk` — 当前工作目录的 basename（home 显示为 `~`）
- `⚡ 4.5% 45.0k` — context 已用百分比 + 当前 token 数
- `12 calls` — 今日总 API 调用数（聚合所有 transcripts）
- `1.5k tok/m` 或 `80 tok/s` — 今日产出速率（output tokens / 跨度秒数）

实现细节：扫 `~/.claude/projects/*/*.jsonl` 当天 mtime 文件，读 `message.usage` 字段聚合。错误一律 swallow，不会让 Claude Code UI 报红。

### Tools：工具版本管理

三个开发工具（Clavue / Claude Code / Codex）的本地版本、npm 最新版、安装、升级——一条命令搞定。

```bash
ccjk tools                     # 看本地三个工具的版本
ccjk tools --check-updates     # 额外查 npm latest，标记 outdated

ccjk install                   # 交互选择要安装的工具
ccjk install codex             # 安装 Codex
ccjk install --all             # 装全部缺失的

ccjk update                    # 交互选择 outdated 的工具更新
ccjk update claude-code        # 更新 Claude Code
ccjk update --all              # 更新所有 outdated
```

输出示例：

```
  Clavue         8.9.2  (latest)
  Claude Code    2.1.138  (latest)
  Codex          0.128.0  → 0.130.0 可升级
```

实现就是 `npm install -g <pkg>` / `npm install -g <pkg>@<latest>`，所有命令执行前都会展示给用户确认。如果 npm 因权限失败，会把建议的 `sudo <cmd>` 打印出来让用户自己跑。加 `--dry-run` 只看命令不执行。

## 支持

| 工具 | 配置目标 | 状态 |
|---|---|---|
| Clavue | `~/.claude/settings.json` | 主推 |
| Claude Code | `~/.claude/settings.json` | 完整支持 |
| Codex | `~/.codex/config.toml` | 仅检测 |

### 内置 Provider

`glm` / `kimi` / `minimax` / `anthropic` / `custom`

## doctor 规则

| 规则 | 严重度 | 说明 |
|---|---|---|
| `model-overrides-env` | error | 顶层 `settings.model` 会覆盖 `env.ANTHROPIC_MODEL` |
| `duplicate-auth` | warn | API_KEY 和 AUTH_TOKEN 同时存在 |
| `missing-credentials` | error | 设了 BASE_URL 但缺凭证 |
| `invalid-base-url` | error | URL 格式不合法 |
| `hook-bloat` | warn | 单个 hook 注册超过 5 个处理器 |

## 设计原则

- 配置工具就是配置工具。不做 brain、orchestrator、sandbox、dashboard 这类东西。
- 不写 `~/.claude/CLAUDE.md`，不装 hooks，不开后台进程。
- 用户不调用，ccjk 就什么都不做。

## 从 v14 升级

v15 是从零重写的版本，命令集和行为都和 v14.x 不兼容：

- v14 的子命令（brain/sandbox/teleport/cloud-sync 等）在 v15 中**不存在**。
- v14 在 `~/.claude/CLAUDE.md` 中注入的 "Smart Assistant Mode" 在 v15 中**不会再写入**。如需手动清理旧版残留，删除该文件中相关段落即可。
- 如果你只用 v14 的 init/mcp/doctor/git 几个核心功能，直接 `npm install -g ccjk@latest` 升级即可。
- 需要 v14 的扩展能力，请固定旧版本：`npm install -g ccjk@14`。

## 开发

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## 许可

[MIT](./LICENSE)
