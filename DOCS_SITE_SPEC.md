# CCJK 文档站点 — 完整开发规范

> 版本：1.0.0
> 日期：2026-02-22
> 目标：独立文档站点，样式参考 https://code.claude.com/docs/zh-CN
> 访问域名：建议 `docs.claudehome.cn`（或 `ccjk.claudehome.cn/docs`）

---

## 一、项目概述

### 1.1 项目背景

CCJK（`npx ccjk`）是一个 Claude Code 超级增强器，功能包括：

- 🧠 **持久记忆** — AI 跨会话记住代码库上下文
- ⚡ **节省 30–50% Token** — 智能上下文压缩
- 🔧 **一键配置** — 自动检测项目类型，30 秒完成
- ☁️ **云端同步** — 多设备、跨团队配置共享
- 🔌 **MCP 市场** — 一键安装 Model Context Protocol 服务
- 🤖 **多工具支持** — Claude Code / Codex / Aider / Continue / Cline / Cursor

### 1.2 目标受众

| 用户类型 | 需求 |
|---------|------|
| 个人开发者 | 快速上手，减少 Claude Code 配置时间 |
| 团队 | 统一配置同步，工作流共享 |
| 企业 | API 代理、私有化部署、权限管理 |

---

## 二、技术栈推荐

| 组件 | 推荐方案 | 备选方案 |
|------|---------|---------|
| 框架 | **VitePress 1.x**（Vue 驱动，Claude 官网同款 SSG）| Docusaurus 3.x |
| 样式 | **Tailwind CSS v4** | UnoCSS |
| 搜索 | **Algolia DocSearch**（免费开源项目申请） | 本地 MiniSearch |
| 部署 | **Vercel / Cloudflare Pages** | Nginx + PM2（现有服务器）|
| 国际化 | VitePress 内置 i18n，初期提供 zh-CN + en | |
| 代码高亮 | Shiki（VitePress 内置）| |

---

## 三、站点信息架构

### 3.1 顶部导航

```
[CCJK Logo]  文档  指南  API 参考  更新日志       [GitHub ★]  [npm]  [语言切换 zh-CN/EN]
```

### 3.2 侧边栏结构（完整）

```
📚 入门
  ├── 什么是 CCJK
  ├── 快速开始（5 分钟）
  ├── 核心概念
  └── 系统要求

🚀 使用指南
  ├── 安装与更新
  ├── 交互菜单详解
  ├── 完整初始化
  ├── 导入工作流
  ├── 配置 API 提供商
  ├── MCP 服务配置
  ├── 默认模型设置
  ├── AI 全局记忆
  ├── 环境变量与权限
  ├── 零配置权限预设
  └── 诊断与修复

🧠 CCJK Brain 系统
  ├── Brain 架构
  ├── 上下文压缩
  ├── 持久化分层（L0/L1/L2）
  ├── 多智能体协作
  └── Brain Dashboard

☁️ 云端服务
  ├── 云端同步概述
  ├── GitHub Gist 同步
  ├── WebDAV 同步
  ├── S3 对象存储同步
  └── 账号注册与登录

🔌 MCP 市场
  ├── 什么是 MCP
  ├── 内置服务列表
  ├── Context7（文档查询）
  ├── Open Web Search（网页搜索）
  ├── Spec Workflow（工作流管理）
  ├── DeepWiki（文档检索）
  ├── Playwright（浏览器自动化）
  ├── Serena（语义代码检索）
  ├── Exa（AI 搜索）
  └── SQLite（本地数据库）

🛠️ 代码工具
  ├── 工具抽象层介绍
  ├── Claude Code
  ├── Codex
  ├── Aider
  ├── Continue
  ├── Cline
  └── Cursor

🤖 API 提供商
  ├── 提供商配置概述
  ├── Anthropic（官方）
  ├── GLM（智谱 AI）
  ├── MiniMax
  ├── Kimi（月之暗面）
  ├── CCR 代理路由
  └── 自定义提供商

⚙️ 高级配置
  ├── 工作流模板开发
  ├── 自定义 Skills
  ├── Hooks 系统
  ├── Agents 管理
  ├── 权限系统详解
  └── Turbo 模式

📡 云端 API（开发者）
  ├── API 概述
  ├── 认证
  ├── Sessions API
  ├── Machines API
  ├── A2A 进化层
  ├── WebSocket 实时通信
  └── SDK 使用

📋 参考
  ├── CLI 命令全览
  ├── 配置文件参考
  ├── 环境变量参考
  └── 错误代码与排查

📝 更新日志
  ├── v11.x
  ├── v10.x
  └── 历史版本
```

---

## 四、各页面详细内容要求

---

### 4.1 「什么是 CCJK」

**路径**：`/zh-CN/` 或 `/zh-CN/intro`

**页面结构**：

```markdown
# CCJK — Claude Code 超级增强器

> 一条命令，30 秒，彻底改变你与 Claude Code 的工作方式。

## 为什么需要 CCJK？

[包含对比表格]
| 维度 | 没有 CCJK | 有 CCJK |
|------|-----------|---------|
| 项目记忆 | 每次对话手动重复背景 | AI 跨会话记住一切 |
| 配置时间 | 60+ 分钟手动配置 | < 30 秒一键完成 |
| Token 成本 | 基准 100% | 降低 30–50% |
| 多设备 | 手动复制文件 | 云端自动同步 |
| MCP 服务 | 手动编写配置 JSON | 交互式安装 |
| 支持工具 | 仅 Claude Code | 6 种主流 AI 代码工具 |

## 核心架构图

[Mermaid 架构图，展示：npx ccjk → 配置层 → Brain层 → Claude Code / Codex...]

## 版本信息

- 当前版本：11.1.0
- npm 包名：`ccjk`
- GitHub：https://github.com/miounet11/ccjk
- 许可证：MIT

## 下一步

→ [快速开始（5 分钟）](/zh-CN/getting-started/quick-start)
```

---

### 4.2 「快速开始」

**路径**：`/zh-CN/getting-started/quick-start`

**页面结构**：

````markdown
# 快速开始

**预计时间：5 分钟**

## 前置要求

| 依赖项 | 最低版本 | 检查命令 |
|--------|---------|---------|
| Node.js | 18.0+ | `node --version` |
| npm / npx | 随 Node.js | `npx --version` |
| Claude Code | 最新版（可选，CCJK 会提示安装） | `claude --version` |

## 第一步：运行 CCJK

在你的项目目录下：

```bash
npx ccjk
```

> **无需全局安装**。npx 会自动下载最新版并运行。

## 第二步：交互式配置

运行后会出现交互菜单：

```
请选择功能
-------- Claude Code --------
  1. 完整初始化    - 安装 Claude Code + 导入工作流 + 配置 API 或 CCR 代理 + 配置 MCP
  2. 导入工作流    - 仅导入/更新工作流相关文件
  3. 配置 API     - 配置 API URL、认证信息或 CCR 代理
  ...
```

**首次使用**：选择 `1`（完整初始化），它会自动：
1. 安装/更新 Claude Code CLI
2. 导入工作流和 Slash Commands
3. 引导配置 API 或代理
4. 安装推荐 MCP 服务

## 第三步：验证

```bash
npx ccjk doctor
```

健康检查通过后，即可开始使用 Claude Code：

```bash
claude
```

## 视频演示

[嵌入演示 GIF 或视频]

## 常见问题

**Q: 需要 API Key 吗？**
A: 使用 Anthropic 官方 API 需要，也可通过 CCR 代理使用第三方 API（如 GLM、Kimi 等）。

**Q: 每次都要运行 npx ccjk 吗？**
A: 不需要。初始化一次后，配置会持久保存。需要修改配置时再运行。

**Q: 支持 Windows 吗？**
A: 支持 Windows 10/11，如果 MCP 在 Windows 出现问题，CCJK 提供自动修复（选项 4）。
````

---

### 4.3 「核心概念」

**路径**：`/zh-CN/getting-started/concepts`

**需要重点介绍的概念**：

1. **Brain 系统** — 类似 AI 的"海马体"，负责跨会话记忆
2. **Skills（技能）** — CLAUDE.md 中的预定义工作流，如代码审查、安全扫描
3. **MCP（Model Context Protocol）** — AI 工具扩展协议
4. **Provider（API 提供商）** — 连接不同 AI 模型的配置
5. **CCR（Claude Code Router）** — 多模型路由代理
6. **Hooks** — 自动化触发器（如 PostToolUse 压缩）

---

### 4.4 「交互菜单详解」

**路径**：`/zh-CN/guide/menu`

**完整菜单选项说明表**：

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `1` | 完整初始化 | 安装 Claude Code + 导入工作流 + 配置 API 或 CCR 代理 + 配置 MCP |
| `2` | 导入工作流 | 仅导入/更新工作流相关文件 |
| `3` | 配置 API 或 CCR 代理 | 配置 API URL、认证信息或 CCR 代理 |
| `4` | 配置 MCP | 配置 MCP 服务（含 Windows 修复）|
| `5` | 配置默认模型 | 设置默认模型（opus/sonnet/sonnet 1m/自定义）|
| `6` | 配置 Claude 全局记忆 | 配置 AI 输出语言和输出风格 |
| `7` | 导入推荐环境变量和权限配置 | 导入隐私保护环境变量和系统权限 |
| `8` | 零配置权限预设 | 一键应用权限预设（最大/开发者/安全）|
| `K` | Skills 管理 | 安装/更新/删除工作流技能 |
| `M` | MCP 管理 | 配置 MCP 服务 |
| `A` | Agents 管理 | 创建/管理 AI 智能体 |
| `P` | 持久化管理 | 管理上下文存储和层级 |
| `R` | CCR | 配置 Claude Code Router |
| `0` | 更改显示语言 | 切换 CCJK 界面语言 |
| `S` | 切换代码工具 | 在 Claude Code / Codex 等之间切换 |
| `-` | 卸载 | 删除 Claude Code 配置和工具 |
| `+` | 检查更新 | 检查并更新 Claude Code、CCR |
| `D` | 一键体检 | 诊断问题并自动修复 |
| `B` | Brain Dashboard | 查看配置健康分数和优化建议 |
| `H` | 帮助文档 | 查看使用指南 |
| `Q` | 退出 | - |

---

### 4.5 「CLI 命令全览」

**路径**：`/zh-CN/reference/cli`

完整命令表格：

| 命令 | 别名 | 说明 |
|------|------|------|
| `npx ccjk` | - | 打开主菜单 |
| `npx ccjk init` | `npx ccjk i` | 完整初始化 |
| `npx ccjk update` | `npx ccjk u` | 更新工作流 |
| `npx ccjk sync` | - | 云端同步 |
| `npx ccjk doctor` | - | 健康检查与自动修复 |
| `npx ccjk status` | - | Brain Dashboard（健康分数）|
| `npx ccjk boost` | - | 一键优化 |
| `npx ccjk skills` | - | 技能管理 |
| `npx ccjk mcp` | - | MCP 管理（智能发现）|
| `npx ccjk agents` | - | 智能体管理 |
| `npx ccjk codex` | - | Codex 配置 |
| `npx ccjk qs` | - | 快速配置（quick-setup）|
| `npx ccjk <provider>` | 如 `npx ccjk glm` | 快速启动指定提供商 |
| `npx ccjk --help` | `-h` | 查看帮助 |
| `npx ccjk --version` | `-v` | 查看版本 |

---

### 4.6 「Brain 系统」

**路径**：`/zh-CN/brain/overview`

**子页面**：

#### 4.6.1 Brain 架构

Brain 系统是 CCJK 的核心，负责管理 Claude Code 的长期记忆：

```
项目根目录/
├── .cursorrules (or CLAUDE.md)   ← L0：当前会话上下文（最新、最精简）
├── .brain/
│   ├── context.md                ← L1：中期记忆（近期变更摘要）
│   ├── architecture.md           ← L1：架构决策记录
│   └── sessions/
│       ├── 2026-02-15.md        ← L2：历史会话存档
│       └── 2026-02-20.md
└── .brainglobal/                 ← 跨项目全局记忆
    └── preferences.md
```

**三层分级体系（L0/L1/L2）**：

| 层级 | 名称 | 用途 | Token 占用 | 保留策略 |
|------|------|------|-----------|---------|
| L0 | 活跃上下文 | 当前工作焦点，总是读取 | ~500-1000 tokens | 每次会话后更新 |
| L1 | 近期记忆 | 近 2 周变更摘要、决策 | ~2000-5000 tokens | 每周自动压缩 |
| L2 | 历史存档 | 完整会话记录 | 按需加载 | 永久保留，不自动加载 |

#### 4.6.2 上下文压缩

CCJK 通过 PostToolUse Hook 自动压缩上下文：

- **触发时机**：当 context 超过阈值（默认 80%）时自动触发
- **压缩算法**：提取关键决策、去重、归档细节
- **节省效果**：平均减少 30–50% Token 消耗

#### 4.6.3 Brain Dashboard

```bash
npx ccjk status
```

显示：
- 总体健康分数（0–100）
- 各项指标评分（Brain 配置、API、MCP 服务、权限等）
- 优化建议列表

---

### 4.7 「MCP 服务」

**路径**：`/zh-CN/mcp/overview`

#### 4.7.1 内置 MCP 服务完整列表

| 服务 ID | 名称 | 类型 | 需要 API Key | 功能简介 |
|---------|------|------|-------------|---------|
| `context7` | Context7 | stdio | ❌ | 查询库的最新文档和代码示例 |
| `open-websearch` | Open Web Search | stdio | ❌ | DuckDuckGo/Bing/Brave 多引擎搜索 |
| `mcp-deepwiki` | DeepWiki | stdio | ❌ | GitHub 仓库文档深度检索 |
| `spec-workflow` | Spec Workflow | stdio | ❌ | 从需求到实现的结构化工作流 |
| `serena` | Serena | uvx | ❌ | Serena IDE 助手，语义代码检索与编辑 |
| `Playwright` | Playwright | stdio | ❌ | 浏览器自动化控制 |
| `exa` | Exa AI Search | stdio | ✅ `EXA_API_KEY` | AI 增强网页搜索 |
| `sqlite` | SQLite | stdio | ❌ | 本地 SQLite 数据库访问 |
| `intent-engine` | Intent Engine | stdio | ❌ | 意图分析引擎 |

#### 4.7.2 安装方法

```bash
# 方式一：菜单安装
npx ccjk        # 选择 4. 配置 MCP

# 方式二：CLI 直接安装
npx ccjk mcp

# 方式三：指定服务
npx ccjk mcp --install context7,serena,Playwright
```

#### 4.7.3 各服务详细介绍页面（每个独立子页面）

每个 MCP 服务需要独立页面，包含：
- 功能介绍
- 安装步骤
- 配置参数
- 使用示例（3–5 个实际对话示例）
- 常见问题

---

### 4.8 「API 提供商」

**路径**：`/zh-CN/providers/overview`

#### 4.8.1 支持的 API 提供商

| 提供商 ID | 名称 | 官网 | 支持的 Code 工具 | 特点 |
|----------|------|------|---------------|------|
| `anthropic` | Anthropic（官方）| anthropic.com | Claude Code | 官方支持，最稳定 |
| `glm` | 智谱 AI (GLM) | zhipuai.cn | Claude Code / Codex | 国内可访问，免费额度 |
| `minimax` | MiniMax | minimax.com | Claude Code / Codex | - |
| `kimi` | Kimi (月之暗面) | moonshot.cn | Claude Code / Codex | 国内可访问 |
| `ccr` | CCR 代理 | - | Claude Code | 多模型路由，统一管理 |

#### 4.8.2 CCR（Claude Code Router）

CCR 是 CCJK 提供的多 AI 模型路由代理，允许：
- 同时配置多个 provider
- 按策略自动选择（成本优先、速度优先等）
- 统一账单管理

配置方式：
```bash
npx ccjk        # 选择 R. CCR
# 或
npx ccjk        # 选择 3. 配置 API → CCR 代理
```

---

### 4.9 「云端同步」

**路径**：`/zh-CN/cloud/overview`

#### 4.9.1 同步提供商

| 提供商 | 特点 | 适合 |
|--------|------|------|
| **GitHub Gist** | 免费，私有 Gist 安全 | 个人开发者 |
| **WebDAV** | 自托管，完全控制 | 隐私敏感场景 |
| **S3** | 企业级可靠性 | 团队/企业 |

#### 4.9.2 启用云同步

```bash
# GitHub Gist
npx ccjk sync --provider github-gist

# WebDAV
npx ccjk sync --provider webdav --url https://your-server/dav

# S3
npx ccjk sync --provider s3 --bucket your-bucket
```

#### 4.9.3 同步的内容

- `~/.claude/settings.json`（API 配置、权限、模型设置）
- MCP 配置
- 工作流模板
- Brain 记忆（可选，加密传输）

---

### 4.10 「云端 API 文档（开发者）」

**路径**：`/zh-CN/api/overview`

> 此章节面向集成 CCJK 云端服务的开发者，普通用户可忽略。

#### 4.10.1 API 基础信息

```
基础 URL：https://remote-api.claudehome.cn
协议：HTTPS / WSS
认证方式：Bearer JWT
内容类型：application/json
```

#### 4.10.2 认证 API

**注册**
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password",
  "name": "Your Name"       // 可选
}

响应 200:
{
  "token": "eyJhbGci...",
  "user": { "id": "xxx", "email": "...", "name": "..." }
}
```

**登录**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}

响应 200:
{
  "token": "eyJhbGci...",
  "user": { "id": "xxx", "email": "...", "name": "..." }
}
```

**GitHub OAuth**
```http
GET /auth/github
→ 302 跳转至 GitHub OAuth 授权页
```

#### 4.10.3 Sessions API

需在 Header 中携带：`Authorization: Bearer <token>`

```http
GET /v1/sessions
→ { "sessions": [...] }

GET /v1/sessions/:id
→ { "session": { "id": "...", "machineId": "...", "status": "..." } }

GET /v1/sessions/:id/messages?limit=100&offset=0
→ { "messages": [...] }

POST /v1/sessions
Content-Type: application/json
{ "machineId": "your_machine_id" }
→ 创建或恢复会话
```

#### 4.10.4 Machines API

```http
GET /v1/machines
→ { "machines": [...] }

POST /v1/machines
Content-Type: application/json
{
  "machineId": "unique_machine_id",
  "name": "My MacBook",
  "platform": "darwin",
  "meta": {}              // 可选扩展信息
}
→ 200 { "machineId": "...", "name": "...", ... }

DELETE /v1/machines/:machineId
```

#### 4.10.5 A2A 进化层 API

A2A（Agent-to-Agent）进化层允许 AI 智能体共享和传播解决方案基因（Gene）。

**Gene 数据结构**：
```typescript
interface Gene {
  type: 'pattern' | 'fix' | 'optimization' | 'workaround'
  problem: {
    signature: string       // 问题唯一标识
    context: string[]       // 上下文标签，如 ['typescript', 'react']
    description?: string
  }
  solution: {
    strategy: string        // 解决策略描述
    code?: string           // 可选代码片段
    steps: string[]         // 解决步骤列表
  }
  metadata: {
    author: string          // 发布者标识
    createdAt: string       // ISO 8601 时间
    tags: string[]          // 标签
    version?: string
  }
}
```

**A2A 接口**：
```http
# 注册智能体
POST /a2a/hello
Authorization: Bearer <token>
→ { "agentId": "xxx" }

# 发布 Gene
POST /a2a/publish
Authorization: Bearer <token>
{
  "type": "publish",
  "gene": { ... }           // Gene 结构（不含 id/sha256/quality）
}
→ { "geneId": "xxx" }

# 获取 Genes
POST /a2a/fetch
Authorization: Bearer <token>
{
  "filter": {
    "type": "fix",
    "tags": ["typescript"]
  },
  "limit": 20
}
→ { "genes": [...] }

# 上报质量反馈
POST /a2a/report
Authorization: Bearer <token>
{
  "geneId": "xxx",
  "quality": 0.9,
  "feedback": "solved my issue"
}
```

#### 4.10.6 WebSocket 实时通信

```javascript
// 连接
const socket = io('https://remote-api.claudehome.cn', {
  auth: {
    token: 'your_jwt_token',
    machineId: 'your_machine_id'
  }
})

// 监听事件
socket.on('connect', () => {
  console.log('已连接，socket.id:', socket.id)
})

// 加入会话
socket.emit('session:join', { sessionId: 'xxx' })

// 离开会话
socket.emit('session:leave', { sessionId: 'xxx' })

// 接收消息
socket.on('message:new', (data) => {
  console.log('新消息:', data)
})
```

#### 4.10.7 健康检查

```http
GET /health
→ {
  "status": "ok",
  "version": "1.0.0",
  "ts": "2026-02-22T00:00:00.000Z"
}
```

---

### 4.11 「配置文件参考」

**路径**：`/zh-CN/reference/config`

#### settings.json 完整字段说明

位置：`~/.claude/settings.json`

```json
{
  "model": "claude-opus-4-5",               // 默认模型
  "apiKeyHelper": "...",                     // API 认证优先命令
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "$HELPER",       // 或直接填 key
    "ANTHROPIC_BASE_URL": "https://..."      // 自定义 API URL
  },
  "permissions": {
    "allow": [
      "Bash(git:*)",                         // 允许的 Bash 命令模式
      "Read(~/.ssh/config)",                 // 允许读取的文件
      "Write(/tmp/**)",
      "mcp__context7"                        // 允许的 MCP 服务
    ],
    "deny": []
  }
}
```

#### 环境变量列表

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `CCJK_LANG` | 强制界面语言 | 系统语言 |
| `CCJK_CODE_TOOL` | 代码工具类型 | `claude-code` |
| `CCJK_CLOUD_URL` | 云端 API 地址 | `https://remote-api.claudehome.cn` |
| `ANTHROPIC_BASE_URL` | Claude API 基础 URL | Anthropic 官方地址 |
| `ANTHROPIC_AUTH_TOKEN` | Claude API Token | - |
| `EXA_API_KEY` | Exa 搜索 API Key | - |

#### 权限语法参考

Claude Code 支持的权限格式（仅以下格式有效）：

```
Bash(pattern)          如 Bash(npm:*)
Read(path)             如 Read(~/.ssh/*)
Write(path)            如 Write(/tmp/*)
Edit(path)
NotebookEdit(path)
WebFetch(domain)       如 WebFetch(github.com)
MCP(server:tool)       如 MCP(context7:*)
mcp__server_name       如 mcp__context7
```

---

### 4.12 「诊断与排查」

**路径**：`/zh-CN/guide/troubleshooting`

```bash
# 运行全面诊断
npx ccjk doctor
```

**常见问题排查表**：

| 问题现象 | 可能原因 | 解决方案 |
|---------|---------|---------|
| `claude` 命令不存在 | Claude Code 未安装 | 运行 `npx ccjk` 选 1（完整初始化）|
| MCP 服务无响应（Windows）| Windows 路径问题 | 运行 `npx ccjk` 选 4（MCP 修复）|
| Token 超出限制 | 上下文过长 | Brain 系统自动压缩，或手动选 P（持久化管理）|
| API 认证失败 | Token 过期或配置错误 | 运行 `npx ccjk` 选 3（重新配置 API）|
| 更新后功能异常 | 配置格式变更 | 运行 `npx ccjk doctor` 自动修复 |

---

## 五、设计规范

### 5.1 视觉风格

参考 https://code.claude.com/docs/zh-CN：

- 背景色：白色（`#ffffff`）+ 暗色模式（`#0f1117`）
- 主色调：使用 CCJK/Claude 品牌色（推荐 `#D97757` 橙色渐变）
- 代码块：暗色背景，Shiki 语法高亮
- 侧边栏：固定宽度 260px，分组折叠
- 内容宽度：最大 800px，居中

### 5.2 代码块规范

所有代码示例需要：
1. 指定语言（`bash`、`json`、`typescript`、`http` 等）
2. 关键行高亮
3. 可一键复制按钮
4. bash 命令区分 `#` 注释风格

### 5.3 警告框类型

| 类型 | 使用场景 |
|------|---------|
| ℹ️ Tip（提示）| 有用的可选信息 |
| ⚠️ Warning（警告）| 需要注意的事项 |
| 🚫 Danger（危险）| 如果不注意会出问题 |
| ✅ 建议做法 | 最佳实践 |

### 5.4 截图与媒体

- CLI 截图：使用 Termshot 或 Carbon.now.sh 生成精美截图
- 演示 GIF：最大 5MB，720p，帧率 15fps
- 所有图片提供 alt text 支持无障碍访问

---

## 六、国际化要求

### 初期支持语言

| 语言 | 路径前缀 | 完成度要求 |
|------|---------|---------|
| 中文（简体）| `/zh-CN/` | 100%（主语言）|
| English | `/en/` | 核心页面（入门 + CLI 参考）|

### 翻译注意事项

- `Brain` 保留英文（品牌词）
- `MCP` 保留英文缩写，首次出现时标注 "Model Context Protocol（模型上下文协议）"
- `Claude Code` 保留英文（品牌词）
- `Slash Commands`（斜杠命令）
- `Hooks`（钩子/自动化触发器）

---

## 七、SEO 与元数据

每个页面需包含：

```html
<title>页面标题 | CCJK 文档</title>
<meta name="description" content="页面简介，100–160 字符">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="https://docs.claudehome.cn/og-image.png">
```

推荐关键词：
- `Claude Code 配置`
- `Claude Code MCP`
- `Claude AI 工具`
- `AI 代码助手配置`
- `ccjk npx`

---

## 八、部署配置建议

### 使用 Vercel（推荐）

```json
// vercel.json
{
  "rewrites": [
    { "source": "/", "destination": "/zh-CN/" },
    { "source": "/docs", "destination": "/zh-CN/" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

### 使用服务器 Nginx

```nginx
server {
    server_name docs.claudehome.cn;
    root /www/wwwroot/docs;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/html text/css application/javascript application/json;

    # 1 年缓存静态资源
    location ~* \.(js|css|png|jpg|gif|ico|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 九、内容优先级（开发顺序）

### 第一阶段（MVP，1 周）

| 优先级 | 页面 |
|--------|------|
| P0 | 首页 / 什么是 CCJK |
| P0 | 快速开始 |
| P0 | 核心概念 |
| P0 | CLI 命令全览 |
| P1 | 交互菜单详解 |
| P1 | 配置文件参考 |
| P1 | MCP 服务列表 |
| P1 | 诊断与排查 |

### 第二阶段（完善，2–3 周）

- Brain 系统详解
- 各 MCP 服务独立页面（8 个）
- 各 API 提供商配置页面
- 云端同步配置
- 云端 API 开发者文档

### 第三阶段（高级）

- 工作流模板开发指南
- 自定义 Skills 教程
- Agents 系统详解
- A2A 进化层集成指南
- 更新日志归档

---

## 十、现有文档资产

以下文件可作为内容参考（位于项目仓库 `docs/` 目录下）：

| 文件路径 | 内容 |
|---------|------|
| `docs/zh-CN/features/mcp.md` | MCP 服务详细说明 |
| `docs/api-endpoints.md` | API 接口参考（含请求/响应示例）|
| `docs/cloud-api-requirements.md` | 云端 API 需求规范 |
| `CHANGELOG.md` | 完整更新日志 |
| `CHANGELOG-v11.md` | v11 新功能详细说明 |
| `README.zh-CN.md` | 中文自述文件（首页基础内容）|
| `README.md` | 英文自述文件 |

---

## 十一、联系与协作

- **GitHub 仓库**：https://github.com/miounet11/ccjk
- **npm 包**：https://www.npmjs.com/package/ccjk
- **当前版本**：11.1.0
- **云端 API**：https://remote-api.claudehome.cn
- **E2E 测试脚本**：`test-e2e-full.mjs`（仓库根目录，验证所有 API 可用性）

如有技术问题，请参考仓库 `CLAUDE.md` 获取架构细节。

---

*文档规范版本：1.0.0 | 生成时间：2026-02-22*
