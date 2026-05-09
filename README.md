# ccjk

> Clavue / Claude Code 配置 CLI。一个命令做完 init、API、MCP、doctor、git 模板。

## 设计哲学

**配置工具就是配置工具。**

- 不做 brain / orchestrator / sandbox / teleport / dashboard
- 不在用户机器上跑 hooks / 后台进程 / 自动注入
- 不在 `~/.claude/CLAUDE.md` 里塞 "Smart Assistant Mode" 这种东西
- 用户不调用就什么都不做

## 安装

```bash
npm install -g ccjk
```

或本地开发：

```bash
pnpm install
pnpm dev <command>
```

## 命令

| 命令 | 用途 |
|---|---|
| `ccjk` | 交互菜单（默认） |
| `ccjk init` | 配置 API（写 `~/.claude/settings.json` env） |
| `ccjk mcp` | 配置 MCP 服务 |
| `ccjk doctor` | 检查 settings.json 常见配置问题 |
| `ccjk detect` | 列出已安装的代码工具 |
| `ccjk git-install` | 安装 `/ccjk:git-commit` 等 slash 模板 |

### 非交互模式

```bash
ccjk init -t clavue -p glm --api-key sk-xxx -y
ccjk mcp -s context7 serena -y
ccjk git-install --scope user -y
```

## 支持的工具

- **Clavue**（主推）→ `~/.claude/settings.json`
- **Claude Code** → `~/.claude/settings.json`
- **Codex** → `~/.codex/config.toml`（暂仅 detect/doctor，不写入）

## 内置 Provider

`glm` / `kimi` / `minimax` / `anthropic` / `custom`

## doctor 规则

| 规则 | 严重度 | 说明 |
|---|---|---|
| `model-overrides-env` | error | 顶层 `settings.model` 会覆盖 `env.ANTHROPIC_MODEL` |
| `duplicate-auth` | warn | API_KEY 和 AUTH_TOKEN 同时存在 |
| `missing-credentials` | error | 有 BASE_URL 没凭证 |
| `invalid-base-url` | error | URL 格式不对 |
| `hook-bloat` | warn | 单个 hook 注册超过 5 个处理器 |

## 重写历史

这是 `ccjk-public` 的第二代。一代有 110 个 command 文件 + 53 个 src/ 子目录 + 6 个子包，typecheck/test 都半红不绿。二代砍到 4 个 command + 1 个 core/ + 0 个子包，全绿。

如果二代有需要的能力一代有但这边没有 —— 那是有意删的，不是漏了。

## 开发

```bash
pnpm typecheck
pnpm test
pnpm build
```
