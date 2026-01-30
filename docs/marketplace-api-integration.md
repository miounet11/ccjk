# CCJK Cloud Marketplace API 对接文档

> 版本: 2.0.0 | 更新日期: 2026-01-30

## 概述

统一市场服务层为 **Miaoda 桌面端** 和 **CCJK CLI** 提供一致的 API 接口，支持 Skills、Agents、MCP Servers、Hooks 四大资源类型的查询、安装、评分等操作。

## 基础信息

| 环境 | Base URL |
|------|----------|
| 生产环境 | `https://api.claudehome.cn` |
| 测试环境 | `https://api-staging.ccjk.dev` |
| 本地开发 | `http://localhost:3000` |

## 认证方式

### 公开接口（无需认证）
- 列表查询
- 详情查询
- 分类查询
- 搜索

### 需要认证的接口
- 安装记录（可选）
- 评分提交（可选）
- 用户数据同步

### 认证 Header
```
Authorization: Bearer <token>
X-Client-ID: miaoda | ccjk-cli
X-Client-Version: 1.0.0
```

---

## API 端点一览

### Miaoda 专用端点 (v2)

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/v2/miaoda/skills` | Skills 列表 |
| GET | `/v2/miaoda/skills/featured` | 精选 Skills |
| GET | `/v2/miaoda/skills/popular` | 热门 Skills |
| GET | `/v2/miaoda/skills/categories` | Skills 分类 |
| GET | `/v2/miaoda/skills/:idOrSlug` | Skill 详情 |
| POST | `/v2/miaoda/skills/:id/install` | 安装 Skill |
| POST | `/v2/miaoda/skills/:id/rate` | 评分 Skill |
| GET | `/v2/miaoda/agents` | Agents 列表 |
| GET | `/v2/miaoda/agents/featured` | 精选 Agents |
| GET | `/v2/miaoda/agents/categories` | Agents 分类 |
| GET | `/v2/miaoda/agents/:idOrSlug` | Agent 详情 |
| POST | `/v2/miaoda/agents/:id/install` | 安装 Agent |
| POST | `/v2/miaoda/agents/:id/rate` | 评分 Agent |
| GET | `/v2/miaoda/mcp` | MCP Servers 列表 |
| GET | `/v2/miaoda/mcp/featured` | 精选 MCP |
| GET | `/v2/miaoda/mcp/categories` | MCP 分类 |
| GET | `/v2/miaoda/mcp/:idOrSlug` | MCP 详情 |
| POST | `/v2/miaoda/mcp/:id/install` | 安装 MCP |
| POST | `/v2/miaoda/mcp/:id/rate` | 评分 MCP |
| GET | `/v2/miaoda/hooks` | Hooks 列表 |
| GET | `/v2/miaoda/hooks/featured` | 精选 Hooks |
| GET | `/v2/miaoda/hooks/by-event/:event` | 按事件查询 |
| GET | `/v2/miaoda/hooks/categories` | Hooks 分类 |
| GET | `/v2/miaoda/hooks/:idOrSlug` | Hook 详情 |
| POST | `/v2/miaoda/hooks/:id/install` | 安装 Hook |
| POST | `/v2/miaoda/hooks/:id/rate` | 评分 Hook |

### CCJK CLI 兼容端点

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/marketplace/skills` | Skills 列表 |
| GET | `/api/marketplace/skills/:idOrSlug` | Skill 详情 |
| GET | `/api/marketplace/agents` | Agents 列表 |
| GET | `/api/marketplace/agents/:idOrSlug` | Agent 详情 |
| GET | `/api/marketplace/mcp` | MCP 列表 |
| GET | `/api/marketplace/mcp/:idOrSlug` | MCP 详情 |
| GET | `/api/marketplace/hooks` | Hooks 列表 |
| GET | `/api/marketplace/hooks/:idOrSlug` | Hook 详情 |
| GET | `/api/marketplace/categories` | 所有分类 |
| GET | `/api/marketplace/stats` | 统计信息 |

---

## 详细接口说明

### 1. Skills API

#### GET /v2/miaoda/skills

获取 Skills 列表，支持分页、筛选、排序。

**请求参数：**

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 20 | 每页数量 (max: 100) |
| category | string | 否 | - | 分类筛选 |
| search | string | 否 | - | 搜索关键词 |
| q | string | 否 | - | 搜索关键词 (别名) |
| sort | string | 否 | popular | 排序: popular/newest/rating |
| featured | boolean | 否 | - | 仅精选 |
| official | boolean | 否 | - | 仅官方 |
| lang | string | 否 | zh-CN | 语言: zh-CN/en |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "skill_abc123",
        "name": "Git 提交助手",
        "slug": "git-commit-assistant",
        "description": "智能 Git 提交信息生成，支持约定式提交格式",
        "version": "1.2.0",
        "author": "CCJK Team",
        "category": "version-control",
        "tags": ["git", "commit", "automation"],
        "systemPrompt": "You are a Git commit message assistant...",
        "installCount": 12580,
        "rating": 4.8,
        "ratingCount": 342,
        "isOfficial": true,
        "isFeatured": true,
        "isInstalled": false,
        "createdAt": "2026-01-15T08:00:00Z",
        "updatedAt": "2026-01-28T12:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

#### GET /v2/miaoda/skills/:idOrSlug

获取单个 Skill 详情。

**路径参数：**
- `idOrSlug`: Skill ID 或 slug

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "skill_abc123",
    "name": "Git 提交助手",
    "slug": "git-commit-assistant",
    "description": "智能 Git 提交信息生成，支持约定式提交格式",
    "version": "1.2.0",
    "author": "CCJK Team",
    "category": "version-control",
    "tags": ["git", "commit", "automation"],
    "systemPrompt": "You are a Git commit message assistant...",
    "installCount": 12580,
    "rating": 4.8,
    "ratingCount": 342,
    "isOfficial": true,
    "isFeatured": true,
    "repositoryUrl": "https://github.com/ccjk-dev/git-commit-skill",
    "documentationUrl": "https://docs.ccjk.dev/skills/git-commit",
    "iconUrl": null,
    "configSchema": null,
    "requirements": ["git"],
    "compatibility": {
      "platforms": ["linux", "macos", "windows"],
      "minClaudeVersion": "1.0.0"
    },
    "createdAt": "2026-01-15T08:00:00Z",
    "updatedAt": "2026-01-28T12:30:00Z"
  }
}
```

#### POST /v2/miaoda/skills/:id/install

记录 Skill 安装。

**请求体：** 无

**响应：**
```json
{
  "success": true,
  "message": "Install recorded"
}
```

#### POST /v2/miaoda/skills/:id/rate

为 Skill 评分。

**请求体：**
```json
{
  "rating": 5
}
```

**响应：**
```json
{
  "success": true,
  "message": "Rating recorded"
}
```

---

### 2. Agents API

#### GET /v2/miaoda/agents

获取 Agents 列表。参数与 Skills 相同。

**响应示例：**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "agent_xyz789",
        "name": "代码审查专家",
        "slug": "code-review-expert",
        "description": "专业的代码审查 Agent，支持多语言",
        "version": "2.0.0",
        "author": "CCJK Team",
        "category": "code-quality",
        "tags": ["review", "quality", "best-practices"],
        "systemPrompt": "You are an expert code reviewer...",
        "modelConfig": {
          "model": "claude-sonnet-4-20250514",
          "maxTokens": 8192,
          "temperature": 0.3
        },
        "toolsConfig": ["Read", "Grep", "Glob"],
        "installCount": 8920,
        "rating": 4.9,
        "ratingCount": 256,
        "isOfficial": true,
        "isFeatured": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 89,
      "totalPages": 5
    }
  }
}
```

---

### 3. MCP Servers API

#### GET /v2/miaoda/mcp

获取 MCP Servers 列表。

**额外参数：**

| 参数 | 类型 | 描述 |
|------|------|------|
| serverType | string | 服务器类型: stdio/http/sse |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "mcp_def456",
        "name": "GitHub MCP Server",
        "slug": "github-mcp-server",
        "description": "GitHub API 集成，支持仓库、Issue、PR 操作",
        "version": "1.5.0",
        "author": "Anthropic",
        "category": "integration",
        "tags": ["github", "git", "api"],
        "serverType": "stdio",
        "command": "npx",
        "args": ["-y", "@anthropic/mcp-server-github"],
        "envVars": ["GITHUB_TOKEN"],
        "toolsProvided": ["create_issue", "list_repos", "create_pr"],
        "resourcesProvided": ["repo://", "issue://"],
        "installCount": 25600,
        "rating": 4.7,
        "ratingCount": 890,
        "isOfficial": true,
        "isFeatured": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

### 4. Hooks API

#### GET /v2/miaoda/hooks

获取 Hooks 列表。

**额外参数：**

| 参数 | 类型 | 描述 |
|------|------|------|
| event | string | 事件类型: PreToolCall/PostToolCall/Notification/Stop/SubagentStop |

#### GET /v2/miaoda/hooks/by-event/:event

按事件类型获取 Hooks。

**路径参数：**
- `event`: 事件类型

**响应示例：**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "hook_ghi012",
        "name": "自动格式化",
        "slug": "auto-format",
        "description": "文件保存后自动格式化代码",
        "version": "1.0.0",
        "author": "CCJK Team",
        "category": "formatting",
        "tags": ["format", "prettier", "eslint"],
        "event": "PostToolCall",
        "matcherType": "tool",
        "matcherPattern": "Write|Edit",
        "hookCommand": "npx prettier --write $FILE",
        "timeout": 30000,
        "installCount": 15800,
        "rating": 4.6,
        "ratingCount": 420,
        "isOfficial": true,
        "isFeatured": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 32,
      "totalPages": 2
    }
  }
}
```

---

### 5. Categories API

#### GET /v2/miaoda/skills/categories

获取 Skills 分类列表。

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "id": "cat_001",
      "slug": "version-control",
      "name": "版本控制",
      "description": "Git 和版本控制相关技能",
      "iconUrl": null,
      "itemCount": 12
    },
    {
      "id": "cat_002",
      "slug": "code-quality",
      "name": "代码质量",
      "description": "代码审查、测试、重构",
      "iconUrl": null,
      "itemCount": 18
    }
  ]
}
```

---

### 6. Stats API (CCJK CLI)

#### GET /api/marketplace/stats

获取市场统计信息。

**响应示例：**

```json
{
  "success": true,
  "data": {
    "skills": 156,
    "agents": 89,
    "mcpServers": 45,
    "hooks": 32,
    "categories": 24
  }
}
```

---

## 错误响应

所有接口在发生错误时返回统一格式：

```json
{
  "success": false,
  "error": "错误描述"
}
```

**常见错误码：**

| HTTP 状态码 | 描述 |
|-------------|------|
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## Miaoda 客户端集成示例

### TypeScript/JavaScript

```typescript
const API_BASE = 'https://api.claudehome.cn/v2/miaoda';

// 获取 Skills 列表
async function fetchSkills(params: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sort?: 'popular' | 'newest' | 'rating';
}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.category) query.set('category', params.category);
  if (params.search) query.set('search', params.search);
  if (params.sort) query.set('sort', params.sort);

  const response = await fetch(`${API_BASE}/skills?${query}`);
  return response.json();
}

// 获取 Skill 详情
async function fetchSkillDetail(idOrSlug: string) {
  const response = await fetch(`${API_BASE}/skills/${idOrSlug}`);
  return response.json();
}

// 安装 Skill
async function installSkill(id: string) {
  const response = await fetch(`${API_BASE}/skills/${id}/install`, {
    method: 'POST'
  });
  return response.json();
}

// 评分 Skill
async function rateSkill(id: string, rating: number) {
  const response = await fetch(`${API_BASE}/skills/${id}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating })
  });
  return response.json();
}
```

### Rust (reqwest)

```rust
use reqwest::Client;
use serde::{Deserialize, Serialize};

const API_BASE: &str = "https://api.claudehome.cn/v2/miaoda";

#[derive(Deserialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<String>,
}

#[derive(Deserialize)]
struct Skill {
    id: String,
    name: String,
    slug: String,
    description: String,
    version: String,
    author: String,
    category: String,
    tags: Vec<String>,
    system_prompt: Option<String>,
    install_count: i32,
    rating: f32,
    rating_count: i32,
    is_official: bool,
    is_featured: bool,
}

async fn fetch_skills(client: &Client) -> Result<Vec<Skill>, reqwest::Error> {
    let response: ApiResponse<ListResult<Skill>> = client
        .get(format!("{}/skills", API_BASE))
        .send()
        .await?
        .json()
        .await?;

    Ok(response.data.map(|d| d.items).unwrap_or_default())
}
```

---

## CCJK CLI 集成示例

```typescript
const API_BASE = 'https://api.claudehome.cn/api/marketplace';

// 搜索 Skills
async function searchSkills(query: string) {
  const response = await fetch(`${API_BASE}/skills?q=${encodeURIComponent(query)}`);
  const result = await response.json();

  if (result.success) {
    return result.data.items.map(skill => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      installCommand: skill.installCommand,
      version: skill.version
    }));
  }
  throw new Error(result.error);
}

// 获取安装命令
async function getInstallCommand(skillId: string) {
  const response = await fetch(`${API_BASE}/skills/${skillId}`);
  const result = await response.json();

  if (result.success) {
    return result.data.installCommand;
  }
  throw new Error(result.error);
}
```

---

## 数据同步策略

### Miaoda 桌面端

1. **启动时同步**：获取精选和热门资源
2. **定期刷新**：每 30 分钟检查更新
3. **按需加载**：用户浏览时加载详情
4. **本地缓存**：缓存已安装资源的元数据

### CCJK CLI

1. **按需查询**：用户执行命令时查询
2. **缓存策略**：本地缓存 24 小时
3. **离线模式**：使用本地缓存数据

---

## 版本兼容性

| API 版本 | 状态 | 说明 |
|----------|------|------|
| v2 | 当前 | Miaoda 专用，完整功能 |
| v1 | 兼容 | CCJK CLI 兼容层 |

---

## 联系方式

- 技术支持：support@ccjk.dev
- API 问题：api@ccjk.dev
- GitHub：https://github.com/ccjk-dev/ccjk-cloud
