# ccjk

> **Clavue / Claude Code / Codex / Grok CLI 的医生 + 快捷操作员** —— 扫描本地配置健康度，经确认后一键写入 API、MCP、模型与工作流。不替代原生工具写代码，不碰 agent runtime。

[![npm](https://img.shields.io/npm/v/ccjk.svg)](https://www.npmjs.com/package/ccjk)
[![license](https://img.shields.io/npm/l/ccjk.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/ccjk.svg)](https://nodejs.org)

## 安装

```bash
npm install -g ccjk
```

升级：`npm install -g ccjk@latest`

## 30 秒看懂

| 角色 | 做什么 | 怎么用 |
|---|---|---|
| **医生** | 只读扫描脏 MCP、坏 Skill、冗余 prompt、配置风险 | `ccjk clean`、菜单 **H** 医生中心 |
| **操作员** | 备份后写入 API / MCP / 模型 / 工作流 | `ccjk init`、菜单 **W** 快捷向导 |

启动交互菜单（推荐入口）：

```bash
ccjk
```

主菜单按 **操作员 / 医生 / 跨工具 / CCJK** 分区；按 **W** 进快捷向导，按 **H** 进医生中心。

## 常见场景

| 场景 | 命令 / 操作 |
|---|---|
| 第一次配置某个工具 | `ccjk init -T codex`（或 `clavue` / `claude-code` / `grok`） |
| Codex 干净起步 / 日常优化 | 菜单 **W** → 完整初始化（预设：干净 / 优化 / 自定义） |
| 环境脏了想清理 | `ccjk clean` 或菜单 **H** → 智能清理 |
| 彻底重置 Codex 再初始化 | 菜单 **W** → 重置后初始化 |
| API 通不通 | `ccjk probe` |
| 切换 Codex API 提供商 | `ccjk config-switch` |
| Grok / Reasonix 状态与启动 | `ccjk grok` / `ccjk reasonix` |
| 检查工具版本更新 | `ccjk check-updates` |

## CLI 命令

| 命令 | 用途 |
|---|---|
| `ccjk` | 交互菜单（默认） |
| `ccjk init` | 完整初始化（API、MCP、模型、工作流、记忆） |
| `ccjk clean` | 环境清理：脏 MCP、坏 Skills、冗余 prompts |
| `ccjk clean --purge-all` | 全部清理（删前备份 Codex 配置） |
| `ccjk clean -s` | 非交互，仅清理高置信度项 |
| `ccjk probe` | HTTP 探活当前 API |
| `ccjk bench` | 轻量延迟基准 |
| `ccjk config-switch` | 切换 Codex provider / Claude 配置 |
| `ccjk update` | 仅更新工作流与记忆文档 |
| `ccjk check-updates` | 检查并更新 Claude Code / Codex / CCR |
| `ccjk grok [profile]` | Grok CLI 状态与 profile 启动 |
| `ccjk reasonix [profile]` | Reasonix 伴侣：状态与启动 |
| `ccjk uninstall` | 卸载 CCJK 管理的配置 |
| `ccjk ccr` | Claude Code Router 配置 |
| `ccjk ccu` | Claude Code 用量分析 |

工具别名：`-T cv`（Clavue）、`-T cc`（Claude Code）、`-T cx`（Codex）、`-T gk`（Grok）。

## 支持的工具

| 工具 | 配置根目录 | ccjk 能力 |
|---|---|---|
| **Clavue** | `~/.clavue/` | 医生 + 操作员：init / MCP / 模型 / 工作流 / 权限 / 清理 |
| **Claude Code** | `~/.claude/` | 同上 |
| **Codex** | `~/.codex/`（`CODEX_HOME`） | 同上 + 三端共用配置（见下） |
| **Grok CLI** | `~/.grok/` + `~/.ccjk/` profile | 医生（清理 skills）+ 轻量操作员（profile 启动） |

ccjk 自身配置只在 `~/.ccjk/`，**绝不混入**各工具目录。

### Codex：CLI + 桌面 App + IDE 扩展

OpenAI 官方设计下，三端**共用同一份** `config.toml`：

- 默认路径：`~/.codex/config.toml`
- 可用环境变量 `CODEX_HOME` 覆盖配置根
- `~/Library/Application Support/Codex`（macOS）等是 Electron 运行时缓存，**不是**配置目录

ccjk 写入配置后：

- **CLI / IDE 扩展**：通常即时生效
- **桌面 App**：若正在运行，需**完全退出后重新打开**

医生中心会显示三端检测状态，并对第三方 provider + `features.goals` / `multi_agent` 给出配置风险提示。

### Codex 初始化预设

| 预设 | AGENTS | 工作流 | MCP |
|---|---|---|---|
| **干净** | 不写 | 不装 | 不装 |
| **优化** | 工程基线 | 默认工程流 | 仅 context7 |
| **自定义** | 用户自选 | 用户自选 | 用户自选 |

## 设计原则

- **配置工具就是配置工具** —— 不做 brain、orchestrator、后台守护进程
- **不主动写代码** —— 不在运行时偷偷注入 hook 或命令
- **备份先行** —— 任何写盘前产生 `.bak-<ts>` 备份
- **可重复** —— `init -s`、`clean -s`、`clean --purge-all` 等支持脚本化

产品细节见 [PRODUCT.md](./PRODUCT.md)，架构见 [ARCHITECTURE.md](./ARCHITECTURE.md)。

## 开发

```bash
pnpm install
pnpm typecheck
pnpm test          # 2500+ tests
pnpm lint
pnpm build
```

```bash
# 冒烟：进入 Codex 菜单
echo '' | node dist/cli.mjs -T codex
```

## 许可

[MIT](./LICENSE)