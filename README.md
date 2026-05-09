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
ccjk            # 交互菜单
ccjk init       # 配置 API
ccjk mcp        # 装 MCP 服务
ccjk doctor     # 检查 settings.json
```

## 命令一览

| 命令 | 用途 |
|---|---|
| `ccjk` | 交互菜单（默认） |
| `ccjk init` | 配置 API：写 `~/.claude/settings.json` 的 env |
| `ccjk mcp` | 选装预设 MCP 服务（context7、serena、playwright、…） |
| `ccjk doctor` | 检查 settings.json 中的常见配置问题 |
| `ccjk detect` | 列出已安装的代码工具 |
| `ccjk git-install` | 安装 `/ccjk:git-commit` 等 slash 命令模板 |

### 非交互模式

```bash
ccjk init -t clavue -p glm --api-key sk-xxx -y
ccjk mcp -s context7 serena -y
ccjk git-install --scope user -y
```

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
