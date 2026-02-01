# CCJK 插件格式规范

> 标准化的插件格式，便于创建和分发

---

## 📚 Skills 格式

### 文件规范
- **格式**: Markdown (`.md`)
- **位置**: `skills/` 目录
- **安装路径**: `~/.claude/skills/`

### 模板
```markdown
---
name: skill-name
description: 简短描述
author: 作者名
version: 1.0.0
tags: [tag1, tag2]
lang: zh-CN
---

# 技能名称

## 描述
这个技能用于...

## 使用方法
/skill-name [参数]

## 执行步骤
1. 第一步
2. 第二步
3. 第三步

## 示例
```
/skill-name --option value
```
```

### 安装命令
```bash
npx ccjk add <github-url> --skill <name>
```

---

## 🔌 MCP 格式

### 文件规范
- **格式**: Node.js 项目
- **位置**: `mcp/` 或 `servers/` 目录
- **配置文件**: `mcp.json`
- **安装路径**: `~/.claude/mcp/`

### 配置模板 (mcp.json)
```json
{
  "name": "mcp-server-name",
  "description": "MCP 服务描述",
  "version": "1.0.0",
  "author": "作者名",
  "command": "node",
  "args": ["dist/index.js"],
  "env": {
    "API_KEY": "${API_KEY}"
  },
  "tools": [
    {
      "name": "tool_name",
      "description": "工具描述"
    }
  ]
}
```

### 目录结构
```
mcp-server-name/
├── package.json
├── mcp.json
├── tsconfig.json
├── src/
│   └── index.ts
└── dist/
    └── index.js
```

### 安装命令
```bash
npx ccjk add <github-url> --mcp <name>
```

---

## 🤖 Agents 格式

### 文件规范
- **格式**: Markdown (`.md`)
- **位置**: `agents/` 目录
- **安装路径**: `~/.claude/agents/`

### 模板
```markdown
---
name: agent-name
description: Agent 描述
author: 作者名
version: 1.0.0
model: claude-sonnet-4-20250514
tools:
  - Read
  - Write
  - Glob
  - Grep
  - Bash
---

# Agent 名称

## 角色定义
你是一位专业的...

## 核心能力
- 能力 1
- 能力 2
- 能力 3

## 工作原则
1. 原则一
2. 原则二
3. 原则三

## 输出规范
- 格式要求
- 质量标准
```

### 安装命令
```bash
npx ccjk add <github-url> --agent <name>
```

---

## 🪝 Hooks 格式

### 文件规范
- **格式**: TypeScript/JavaScript (`.ts` / `.js`)
- **位置**: `hooks/` 目录
- **安装路径**: `~/.claude/hooks/`

### 模板
```typescript
// hook-name.ts
import type { HookContext, HookResult } from 'ccjk'

/**
 * Hook 配置
 */
export const config = {
  name: 'hook-name',
  description: 'Hook 描述',
  version: '1.0.0',
  author: '作者名',
  event: 'pre-commit' // 触发事件
}

/**
 * Hook 主函数
 */
export default async function handler(
  ctx: HookContext
): Promise<HookResult> {
  console.log('Hook executing...')

  // 你的逻辑
  const result = await ctx.exec('npm run lint')

  if (result.exitCode !== 0) {
    return {
      success: false,
      message: 'Check failed'
    }
  }

  return {
    success: true,
    message: 'Check passed'
  }
}
```

### 支持的事件
| 事件 | 说明 |
|------|------|
| `pre-commit` | 提交前触发 |
| `post-commit` | 提交后触发 |
| `pre-push` | 推送前触发 |
| `post-build` | 构建后触发 |
| `on-error` | 错误时触发 |
| `on-start` | 启动时触发 |

### 安装命令
```bash
npx ccjk add <github-url> --hook <name>
```

---

## 📦 仓库结构规范

### 推荐结构
```
my-ccjk-plugins/
├── README.md              # 仓库说明
├── skills/                # Skills 目录
│   ├── skill-1.md
│   ├── skill-2.md
│   └── index.json         # 可选：Skills 索引
├── agents/                # Agents 目录
│   ├── agent-1.md
│   ├── agent-2.md
│   └── index.json         # 可选：Agents 索引
├── mcp/                   # MCP 目录
│   ├── server-1/
│   │   ├── package.json
│   │   ├── mcp.json
│   │   └── src/
│   └── server-2/
│       ├── package.json
│       ├── mcp.json
│       └── src/
├── hooks/                 # Hooks 目录
│   ├── hook-1.ts
│   ├── hook-2.ts
│   └── index.json         # 可选：Hooks 索引
└── ccjk.json              # 可选：仓库配置
```

### 索引文件格式 (index.json)
```json
{
  "plugins": [
    {
      "name": "plugin-name",
      "description": "插件描述",
      "version": "1.0.0",
      "file": "plugin-name.md"
    }
  ]
}
```

### 仓库配置 (ccjk.json)
```json
{
  "name": "my-ccjk-plugins",
  "description": "我的 CCJK 插件集合",
  "author": "作者名",
  "version": "1.0.0",
  "skills": "skills/",
  "agents": "agents/",
  "mcp": "mcp/",
  "hooks": "hooks/"
}
```

---

## 🎯 快速参考卡片

### Skills
```
格式: .md | 位置: skills/ | 安装: --skill <name>
```

### MCP
```
格式: Node.js + mcp.json | 位置: mcp/ | 安装: --mcp <name>
```

### Agents
```
格式: .md | 位置: agents/ | 安装: --agent <name>
```

### Hooks
```
格式: .ts/.js | 位置: hooks/ | 安装: --hook <name>
```

---

## 📝 Frontmatter 字段参考

### 通用字段
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 插件名称（唯一标识） |
| `description` | string | ✅ | 简短描述 |
| `author` | string | ❌ | 作者名 |
| `version` | string | ❌ | 版本号 |
| `tags` | string[] | ❌ | 标签列表 |
| `lang` | string | ❌ | 语言代码 |

### Skills 专用
| 字段 | 类型 | 说明 |
|------|------|------|
| `args` | object | 参数定义 |
| `examples` | string[] | 使用示例 |

### Agents 专用
| 字段 | 类型 | 说明 |
|------|------|------|
| `model` | string | 推荐模型 |
| `tools` | string[] | 可用工具 |
| `temperature` | number | 温度参数 |

### Hooks 专用
| 字段 | 类型 | 说明 |
|------|------|------|
| `event` | string | 触发事件 |
| `priority` | number | 执行优先级 |
| `async` | boolean | 是否异步 |
