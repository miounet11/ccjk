# CCJK 插件安装指南

> 一键安装，即刻增强你的 AI 编程体验

---

## 🚀 快速开始

CCJK 提供统一的 `add` 命令，让你可以从 GitHub 仓库快速安装各类插件：

```bash
npx ccjk add <github-url> --<type> <name>
```

---

## 📚 Skills（技能）

### 什么是 Skills？
Skills 是预定义的工作流模板，帮助 Claude 更好地完成特定任务，如代码审查、Git 提交、文档生成等。

### 安装命令
```bash
# 安装指定 Skill
npx ccjk add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines

# 交互式选择安装
npx ccjk add https://github.com/vercel-labs/agent-skills --skill

# 列出所有可用 Skills
npx ccjk add https://github.com/vercel-labs/agent-skills --skill --list
```

### Skill 文件格式
```markdown
---
name: my-skill
description: 技能描述
author: 作者名
version: 1.0.0
tags: [tag1, tag2]
---

# 技能标题

## 使用说明
技能的详细使用说明...

## 执行步骤
1. 步骤一
2. 步骤二
3. 步骤三
```

### 目录结构
```
your-skills-repo/
├── skills/
│   ├── code-review.md
│   ├── git-commit.md
│   └── doc-generator.md
└── README.md
```

---

## 🔌 MCP（Model Context Protocol）

### 什么是 MCP？
MCP 是模型上下文协议服务，为 Claude 提供额外的工具能力，如文件系统访问、数据库查询、API 调用等。

### 安装命令
```bash
# 安装指定 MCP 服务
npx ccjk add https://github.com/anthropics/mcp-servers --mcp filesystem

# 交互式选择安装
npx ccjk add https://github.com/anthropics/mcp-servers --mcp

# 列出所有可用 MCP
npx ccjk add https://github.com/anthropics/mcp-servers --mcp --list
```

### MCP 配置格式
```json
{
  "name": "my-mcp-server",
  "description": "MCP 服务描述",
  "version": "1.0.0",
  "command": "node",
  "args": ["dist/index.js"],
  "env": {
    "API_KEY": "${API_KEY}"
  }
}
```

### 目录结构
```
your-mcp-repo/
├── servers/
│   ├── filesystem/
│   │   ├── package.json
│   │   ├── mcp.json
│   │   └── src/
│   └── database/
│       ├── package.json
│       ├── mcp.json
│       └── src/
└── README.md
```

---

## 🤖 Agents（智能体）

### 什么是 Agents？
Agents 是专门化的 AI 助手配置，针对特定领域或任务进行优化，如 UI 设计师、代码审查员、测试工程师等。

### 安装命令
```bash
# 安装指定 Agent
npx ccjk add https://github.com/your-org/agents --agent ui-designer

# 交互式选择安装
npx ccjk add https://github.com/your-org/agents --agent

# 列出所有可用 Agents
npx ccjk add https://github.com/your-org/agents --agent --list
```

### Agent 文件格式
```markdown
---
name: ui-designer
description: UI/UX 设计专家
author: 作者名
version: 1.0.0
model: claude-sonnet-4-20250514
tools: [Read, Write, Glob, Grep, WebFetch]
---

# UI/UX 设计专家

## 角色定义
你是一位专业的 UI/UX 设计师...

## 专业能力
- 界面设计
- 用户体验优化
- 设计系统构建

## 工作流程
1. 需求分析
2. 原型设计
3. 视觉设计
4. 交互优化
```

### 目录结构
```
your-agents-repo/
├── agents/
│   ├── ui-designer.md
│   ├── code-reviewer.md
│   └── test-engineer.md
└── README.md
```

---

## 🪝 Hooks（钩子）

### 什么是 Hooks？
Hooks 是生命周期钩子脚本，在特定事件发生时自动执行，如提交前检查、构建后通知等。

### 安装命令
```bash
# 安装指定 Hook
npx ccjk add https://github.com/your-org/hooks --hook pre-commit

# 交互式选择安装
npx ccjk add https://github.com/your-org/hooks --hook

# 列出所有可用 Hooks
npx ccjk add https://github.com/your-org/hooks --hook --list
```

### Hook 文件格式
```typescript
// hooks/pre-commit.ts
import type { HookContext } from 'ccjk'

export default async function preCommit(ctx: HookContext) {
  // 钩子逻辑
  console.log('Running pre-commit hook...')

  // 执行检查
  const result = await ctx.exec('npm run lint')

  if (result.exitCode !== 0) {
    throw new Error('Lint check failed')
  }

  return { success: true }
}

export const config = {
  name: 'pre-commit',
  description: '提交前代码检查',
  event: 'pre-commit',
  version: '1.0.0'
}
```

### 目录结构
```
your-hooks-repo/
├── hooks/
│   ├── pre-commit.ts
│   ├── post-build.ts
│   └── on-error.ts
└── README.md
```

---

## 📋 命令参考

### 通用选项

| 选项 | 说明 | 示例 |
|------|------|------|
| `--skill <name>` | 安装指定 Skill | `--skill code-review` |
| `--mcp <name>` | 安装指定 MCP | `--mcp filesystem` |
| `--agent <name>` | 安装指定 Agent | `--agent ui-designer` |
| `--hook <name>` | 安装指定 Hook | `--hook pre-commit` |
| `--list` | 列出所有可用插件 | `--skill --list` |
| `--force` | 强制覆盖已存在的插件 | `--skill my-skill --force` |

### 完整示例

```bash
# Skills
npx ccjk add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines
npx ccjk add https://github.com/your-org/skills --skill code-review --force

# MCP
npx ccjk add https://github.com/anthropics/mcp-servers --mcp filesystem
npx ccjk add https://github.com/your-org/mcp --mcp database

# Agents
npx ccjk add https://github.com/your-org/agents --agent ui-designer
npx ccjk add https://github.com/your-org/agents --agent test-engineer

# Hooks
npx ccjk add https://github.com/your-org/hooks --hook pre-commit
npx ccjk add https://github.com/your-org/hooks --hook post-build
```

---

## 🎨 菜单安装

除了命令行，你也可以通过交互式菜单安装插件：

```bash
# 进入主菜单
npx ccjk

# 选择对应的管理选项
# 5. 📚 Skills 管理 → 📥 从 URL 安装
# 6. 🔌 MCP 管理 → 📥 从 URL 安装
# 7. 🤖 Agents 管理 → 📥 从 URL 安装
```

---

## 🔧 创建你自己的插件仓库

### 推荐的仓库结构

```
my-ccjk-plugins/
├── skills/
│   ├── skill-1.md
│   └── skill-2.md
├── agents/
│   ├── agent-1.md
│   └── agent-2.md
├── mcp/
│   └── my-mcp/
│       ├── package.json
│       ├── mcp.json
│       └── src/
├── hooks/
│   ├── hook-1.ts
│   └── hook-2.ts
└── README.md
```

### 发布你的插件

1. 创建 GitHub 仓库
2. 按照上述格式组织文件
3. 分享仓库 URL 给其他用户
4. 用户即可通过 `npx ccjk add` 安装

---

## ❓ 常见问题

### Q: 安装失败怎么办？
A: 检查网络连接，确保 GitHub URL 正确，尝试使用 `--force` 选项。

### Q: 如何更新已安装的插件？
A: 使用相同的安装命令加 `--force` 选项即可覆盖更新。

### Q: 支持私有仓库吗？
A: 支持，需要先配置 GitHub 认证。

### Q: 插件安装在哪里？
A:
- Skills: `~/.claude/skills/`
- Agents: `~/.claude/agents/`
- MCP: `~/.claude/mcp/`
- Hooks: `~/.claude/hooks/`

---

## 📞 获取帮助

- 文档：https://github.com/anthropics/claude-code
- 问题反馈：https://github.com/anthropics/claude-code/issues
- 社区讨论：https://github.com/anthropics/claude-code/discussions

---

**Happy Coding with CCJK! 🚀**
