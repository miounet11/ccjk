# CCJK 插件快速参考

## 🚀 一键安装命令

```bash
npx ccjk add <github-url> --<type> <name>
```

---

## 📚 Skills（技能）

**用途**: 预定义工作流模板，如代码审查、Git 提交、文档生成

```bash
npx ccjk add https://github.com/org/repo --skill skill-name
```

| 项目 | 说明 |
|------|------|
| 格式 | Markdown (`.md`) |
| 位置 | `skills/` |
| 安装路径 | `~/.claude/skills/` |

<details>
<summary>📄 文件模板</summary>

```markdown
---
name: my-skill
description: 技能描述
version: 1.0.0
---

# 技能名称

## 执行步骤
1. 步骤一
2. 步骤二
```
</details>

---

## 🔌 MCP（协议服务）

**用途**: 扩展 Claude 能力，如文件系统、数据库、API 调用

```bash
npx ccjk add https://github.com/org/repo --mcp server-name
```

| 项目 | 说明 |
|------|------|
| 格式 | Node.js + `mcp.json` |
| 位置 | `mcp/` 或 `servers/` |
| 安装路径 | `~/.claude/mcp/` |

<details>
<summary>📄 配置模板</summary>

```json
{
  "name": "my-mcp",
  "description": "MCP 描述",
  "command": "node",
  "args": ["dist/index.js"]
}
```
</details>

---

## 🤖 Agents（智能体）

**用途**: 专业化 AI 助手，如 UI 设计师、测试工程师

```bash
npx ccjk add https://github.com/org/repo --agent agent-name
```

| 项目 | 说明 |
|------|------|
| 格式 | Markdown (`.md`) |
| 位置 | `agents/` |
| 安装路径 | `~/.claude/agents/` |

<details>
<summary>📄 文件模板</summary>

```markdown
---
name: my-agent
description: Agent 描述
model: claude-sonnet-4-20250514
tools: [Read, Write, Bash]
---

# Agent 名称

## 角色定义
你是一位专业的...
```
</details>

---

## 🪝 Hooks（钩子）

**用途**: 生命周期脚本，如提交前检查、构建后通知

```bash
npx ccjk add https://github.com/org/repo --hook hook-name
```

| 项目 | 说明 |
|------|------|
| 格式 | TypeScript/JavaScript |
| 位置 | `hooks/` |
| 安装路径 | `~/.claude/hooks/` |

<details>
<summary>📄 文件模板</summary>

```typescript
export const config = {
  name: 'my-hook',
  event: 'pre-commit'
}

export default async function(ctx) {
  // 钩子逻辑
  return { success: true }
}
```
</details>

---

## 📋 命令选项

| 选项 | 说明 |
|------|------|
| `--skill <name>` | 安装 Skill |
| `--mcp <name>` | 安装 MCP |
| `--agent <name>` | 安装 Agent |
| `--hook <name>` | 安装 Hook |
| `--list` | 列出可用插件 |
| `--force` | 强制覆盖 |

---

## 🎯 示例

```bash
# 安装 Skill
npx ccjk add https://github.com/vercel-labs/agent-skills --skill web-design

# 安装 MCP
npx ccjk add https://github.com/anthropics/mcp-servers --mcp filesystem

# 安装 Agent
npx ccjk add https://github.com/my-org/agents --agent ui-designer

# 安装 Hook
npx ccjk add https://github.com/my-org/hooks --hook pre-commit

# 列出所有可用 Skills
npx ccjk add https://github.com/vercel-labs/agent-skills --skill --list
```
