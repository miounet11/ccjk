# CCJK Cloud API 需求文档

**版本**: v1.0
**日期**: 2025-01-23
**目标**: 为 CCJK CLI 提供云端智能推荐和模板管理服务
**域名**: `https://api.claudehome.cn`

---

## 📋 目录

1. [概述](#概述)
2. [API 端点清单](#api-端点清单)
3. [详细接口规范](#详细接口规范)
4. [数据模型](#数据模型)
5. [认证与授权](#认证与授权)
6. [错误处理](#错误处理)
7. [性能要求](#性能要求)

---

## 概述

### 业务场景

CCJK CLI 需要云端服务支持以下核心功能：

1. **智能项目分析** - 分析用户项目并推荐合适的 Agent/Skill/MCP/Hook
2. **模板管理** - 提供统一的模板查询、搜索、批量获取
3. **技能市场** - 用户浏览、安装、评分技能
4. **用户技能管理** - 管理用户已安装的技能
5. **使用统计** - 收集使用数据用于改进推荐

### 技术栈要求

- **协议**: HTTPS
- **格式**: JSON
- **认证**: Bearer Token (可选，部分接口需要)
- **超时**: 10 秒（默认），5 秒（遥测接口）
- **重试**: 支持指数退避重试

---

## API 端点清单

### 基础信息

- **Base URL**: `https://api.claudehome.cn`
- **API 前缀**: `/api/v1` (除 `/health` 外)
- **User-Agent**: `CCJK/{version}`

### 端点列表

| 端点 | 方法 | 认证 | 用途 | 优先级 |
|------|------|------|------|--------|
| `/health` | GET | ❌ | 健康检查 | P0 |
| `/api/v1/specs` | POST | ❌ | 项目分析与推荐 | P0 |
| `/api/v8/templates` | GET | ❌ | 列出模板 | P0 |
| `/api/v8/templates/{id}` | GET | ❌ | 获取单个模板 | P0 |
| `/api/v8/templates/batch` | POST | ❌ | 批量获取模板 | P1 |
| `/api/v8/templates/categories` | GET | ❌ | 获取分类列表 | P1 |
| `/api/v8/templates/trending` | GET | ❌ | 热门模板 | P1 |
| `/api/v8/templates/featured` | GET | ❌ | 精选模板 | P1 |
| `/api/v8/templates/{id}/versions` | GET | ❌ | 版本历史 | P1 |
| `/api/v8/templates/check-updates` | POST | ❌ | 批量检查更新 | P1 |
| `/api/v8/skills/marketplace` | GET | ❌ | 技能市场列表 | P1 |
| `/api/v8/skills/user` | GET | ✅ | 用户已安装技能 | P1 |
| `/api/v8/skills/user/install` | POST | ✅ | 安装技能 | P1 |
| `/api/v8/skills/user/uninstall` | DELETE | ✅ | 卸载技能 | P1 |
| `/api/v8/skills/suggestions` | GET | ✅ | 技能推荐 | P1 |
| `/api/v8/mcp/marketplace` | GET | ❌ | MCP 包市场列表 | P1 |
| `/api/v8/mcp/{id}` | GET | ❌ | 获取单个 MCP 包 | P1 |
| `/api/v8/mcp/user` | GET | ✅ | 用户已安装 MCP | P1 |
| `/api/v8/mcp/user/install` | POST | ✅ | 安装 MCP 包 | P1 |
| `/api/v8/mcp/user/uninstall` | DELETE | ✅ | 卸载 MCP 包 | P1 |
| `/api/v8/agents/user` | GET | ✅ | 用户已安装 Agent | P1 |
| `/api/v8/agents/user/install` | POST | ✅ | 安装 Agent | P1 |
| `/api/v8/agents/user/uninstall` | DELETE | ✅ | 卸载 Agent | P1 |
| `/api/v8/hooks/user` | GET | ✅ | 用户已安装 Hook | P1 |
| `/api/v8/hooks/user/install` | POST | ✅ | 安装 Hook | P1 |
| `/api/v8/hooks/user/uninstall` | DELETE | ✅ | 卸载 Hook | P1 |
| `/api/v1/hooks/recommendations` | POST | ❌ | Hook 推荐 | P1 |
| `/api/v1/hooks/community` | GET | ❌ | 社区 Hook 列表 | P1 |
| `/api/v8/ratings/{type}/{id}` | GET | ❌ | 获取评分 | P1 |
| `/api/v8/ratings/{type}/{id}` | POST | ✅ | 提交评分 | P1 |
| `/api/v8/search/suggestions` | GET | ❌ | 搜索建议 | P2 |
| `/api/v1/auth/login` | POST | ❌ | 用户登录 | P0 |
| `/api/v1/auth/logout` | POST | ✅ | 用户登出 | P1 |
| `/api/v1/auth/refresh` | POST | ✅ | 刷新 Token | P0 |
| `/api/v1/auth/me` | GET | ✅ | 获取用户信息 | P1 |
| `/api/v1/telemetry/events` | POST | ❌ | 事件追踪 | P2 |
| `/api/v1/telemetry/errors` | POST | ❌ | 错误上报 | P2 |
| `/api/v1/usage/current` | POST | ❌ | 上报使用数据 | P2 |

**优先级说明**:
- P0: 核心功能，必须实现
- P1: 重要功能，建议实现
- P2: 增强功能，可选实现

---

## 详细接口规范

### 1. 健康检查

**端点**: `GET /health`
**认证**: 不需要
**用途**: 检查 API 服务状态

#### 请求示例

```bash
curl https://api.claudehome.cn/health
```

#### 响应示例

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-01-23T10:00:00Z"
}
```

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | 服务状态: `healthy`, `degraded`, `unhealthy` |
| version | string | API 版本号 |
| timestamp | string | ISO 8601 时间戳 |

---

### 2. 项目分析与推荐

**端点**: `POST /api/v1/specs`
**认证**: 不需要
**用途**: 分析项目依赖和配置，返回推荐的 Agent/Skill/MCP/Hook

#### 请求示例

```bash
curl -X POST https://api.claudehome.cn/api/v1/specs \
  -H "Content-Type: application/json" \
  -d '{
    "projectRoot": "/Users/user/my-project",
    "dependencies": {
      "react": "^18.0.0",
      "typescript": "^5.0.0"
    },
    "devDependencies": {
      "vite": "^5.0.0"
    },
    "gitRemote": "https://github.com/user/repo"
  }'
```

#### 请求体

```typescript
interface ProjectAnalysisRequest {
  projectRoot: string                    // 项目根路径
  dependencies?: Record<string, string>  // package.json dependencies
  devDependencies?: Record<string, string>
  gitRemote?: string                     // Git 远程仓库 URL
  frameworks?: string[]                  // 检测到的框架
  languages?: string[]                   // 检测到的语言
}
```

#### 响应示例

```json
{
  "requestId": "req_abc123",
  "projectType": "react",
  "frameworks": ["react", "vite", "typescript"],
  "recommendations": [
    {
      "id": "react-dev-agent",
      "name": {
        "en": "React Development Agent",
        "zh-CN": "React 开发助手"
      },
      "description": {
        "en": "Specialized agent for React development",
        "zh-CN": "专为 React 开发优化的智能助手"
      },
      "category": "agent",
      "relevanceScore": 0.95,
      "config": {
        "skills": ["react-hooks", "jsx-refactor"],
        "mcpServers": ["filesystem", "git"],
        "persona": "You are a React expert..."
      },
      "installCommand": "ccjk agents add react-dev-agent",
      "tags": ["react", "frontend", "typescript"]
    },
    {
      "id": "typescript-skill",
      "name": {
        "en": "TypeScript Helper",
        "zh-CN": "TypeScript 助手"
      },
      "description": {
        "en": "Type checking and refactoring",
        "zh-CN": "类型检查和重构工具"
      },
      "category": "skill",
      "relevanceScore": 0.88,
      "config": {
        "commands": ["type-check", "add-types"],
        "filePatterns": ["**/*.ts", "**/*.tsx"]
      },
      "installCommand": "ccjk skills add typescript-skill",
      "tags": ["typescript", "type-checking"]
    }
  ]
}
```

#### 响应字段

```typescript
interface ProjectAnalysisResponse {
  requestId: string
  projectType: string
  frameworks: string[]
  recommendations: Recommendation[]
}

interface Recommendation {
  id: string
  name: MultilingualString
  description: MultilingualString
  category: 'agent' | 'skill' | 'mcp' | 'hook'
  relevanceScore: number              // 0-1 之间，推荐相关度
  config: Record<string, unknown>     // 配置对象（Agent/Skill/MCP/Hook 特定）
  installCommand?: string             // 安装命令
  tags: string[]
}

interface MultilingualString {
  en: string
  'zh-CN'?: string
}
```

---

### 3. 列出模板

**端点**: `GET /api/v8/templates`
**认证**: 不需要
**用途**: 搜索和列出可用模板

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | ❌ | 模板类型: `agent`, `skill`, `mcp`, `hook` |
| category | string | ❌ | 分类过滤 |
| query | string | ❌ | 搜索关键词 |
| tags | string | ❌ | 标签过滤（逗号分隔） |
| is_official | boolean | ❌ | 只显示官方模板 |
| is_featured | boolean | ❌ | 只显示精选模板 |
| sortBy | string | ❌ | 排序字段: `name_en`, `download_count`, `rating_average`, `updated_at` |
| order | string | ❌ | 排序方向: `asc`, `desc` |
| limit | number | ❌ | 每页数量（默认 20，最大 100） |
| offset | number | ❌ | 偏移量（默认 0） |

#### 请求示例

```bash
curl "https://api.claudehome.cn/api/v8/templates?type=agent&limit=10&sortBy=download_count&order=desc"
```

#### 响应示例

```json
{
  "items": [
    {
      "id": "react-dev-agent",
      "type": "agent",
      "name_en": "React Development Agent",
      "name_zh_cn": "React 开发助手",
      "description_en": "Specialized agent for React development",
      "description_zh_cn": "专为 React 开发优化的智能助手",
      "category": "frontend",
      "tags": ["react", "frontend", "typescript"],
      "version": "1.2.0",
      "author": "CCJK Team",
      "is_official": true,
      "is_featured": true,
      "is_verified": true,
      "download_count": 15420,
      "rating_average": 4.8,
      "rating_count": 234,
      "repository_url": "https://github.com/ccjk/react-agent",
      "documentation_url": "https://docs.claudehome.cn/agents/react",
      "install_command": "ccjk agents add react-dev-agent",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2025-01-20T15:30:00Z"
    }
  ],
  "total": 156,
  "limit": 10,
  "offset": 0
}
```

#### 响应字段

```typescript
interface TemplateListResponse {
  items: Template[]
  total: number
  limit: number
  offset: number
}

interface Template {
  // 基础信息
  id: string
  type: 'agent' | 'skill' | 'mcp' | 'hook'
  name_en: string
  name_zh_cn?: string
  description_en?: string
  description_zh_cn?: string
  category: string
  tags: string[]

  // 版本信息
  version: string
  author?: string
  repository_url?: string
  npm_package?: string
  install_command?: string
  documentation_url?: string

  // 状态标记
  is_official: boolean
  is_featured: boolean
  is_verified: boolean

  // 统计数据
  download_count: number
  rating_average: number
  rating_count: number

  // 时间戳
  created_at: string
  updated_at: string
}
```

---

### 4. 获取单个模板

**端点**: `GET /api/v8/templates/{id}`
**认证**: 不需要
**用途**: 获取模板详细信息和内容

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| language | string | ❌ | 语言偏好: `en`, `zh-CN` |

#### 请求示例

```bash
curl "https://api.claudehome.cn/api/v8/templates/react-dev-agent?language=zh-CN"
```

#### 响应示例

```json
{
  "id": "react-dev-agent",
  "type": "agent",
  "name_en": "React Development Agent",
  "name_zh_cn": "React 开发助手",
  "description_en": "Specialized agent for React development",
  "description_zh_cn": "专为 React 开发优化的智能助手",
  "category": "frontend",
  "tags": ["react", "frontend", "typescript"],
  "version": "1.2.0",
  "author": "CCJK Team",

  "template_content": "{
    \"name\": \"react-dev\",
    \"persona\": \"You are a React expert...\",
    \"skills\": [\"react-hooks\", \"jsx-refactor\"],
    \"mcpServers\": [\"filesystem\", \"git\"]
  }",

  "config_schema": {
    "type": "object",
    "properties": {
      "typescript": { "type": "boolean", "default": true },
      "strictMode": { "type": "boolean", "default": true }
    }
  },

  "requirements": [
    "Node.js >= 18",
    "React >= 18.0.0"
  ],

  "compatibility": {
    "platforms": ["darwin", "linux", "win32"],
    "frameworks": ["react", "next.js", "remix"],
    "languages": ["typescript", "javascript"]
  },

  "usage_examples": [
    {
      "title": "Basic Setup",
      "description": "Install and configure the agent",
      "code": "ccjk agents add react-dev-agent\nccjk agents switch react-dev"
    }
  ],

  "is_official": true,
  "is_featured": true,
  "is_verified": true,
  "download_count": 15420,
  "rating_average": 4.8,
  "rating_count": 234,

  "repository_url": "https://github.com/ccjk/react-agent",
  "documentation_url": "https://docs.claudehome.cn/agents/react",
  "install_command": "ccjk agents add react-dev-agent",

  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2025-01-20T15:30:00Z"
}
```

---

### 5. 批量获取模板

**端点**: `POST /api/v8/templates/batch`
**认证**: 不需要
**用途**: 一次获取多个模板（用于缓存预热）

#### 请求示例

```bash
curl -X POST https://api.claudehome.cn/api/v8/templates/batch \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["react-dev-agent", "typescript-skill", "git-mcp"],
    "language": "zh-CN",
    "includeStats": true
  }'
```

#### 请求体

```typescript
interface BatchTemplateRequest {
  ids: string[]              // 模板 ID 列表（最多 50 个）
  language?: 'en' | 'zh-CN'  // 语言偏好
  includeStats?: boolean     // 是否包含统计信息
}
```

#### 响应示例

```json
{
  "requestId": "batch_xyz789",
  "templates": {
    "react-dev-agent": { /* Template 对象 */ },
    "typescript-skill": { /* Template 对象 */ },
    "git-mcp": { /* Template 对象 */ }
  },
  "notFound": [],
  "stats": {
    "totalTemplates": 3,
    "cacheHits": 2,
    "cacheMisses": 1,
    "cacheSize": 1024000
  }
}
```

#### 响应字段

```typescript
interface BatchTemplateResponse {
  requestId: string
  templates: Record<string, Template>  // ID -> Template 映射
  notFound: string[]                   // 未找到的模板 ID
  stats?: {
    totalTemplates: number
    cacheHits: number
    cacheMisses: number
    cacheSize: number
  }
}
```

---

### 6. 技能市场列表

**端点**: `GET /api/v8/skills/marketplace`
**认证**: 不需要
**用途**: 浏览技能市场

#### 请求参数

与 `/api/v8/templates` 相同，但 `type` 固定为 `skill`

#### 请求示例

```bash
curl "https://api.claudehome.cn/api/v8/skills/marketplace?category=development&limit=20"
```

#### 响应格式

与 `/api/v8/templates` 响应格式相同

---

### 7. 用户已安装技能

**端点**: `GET /api/v8/skills/user`
**认证**: **需要** Bearer Token
**用途**: 获取用户已安装的技能列表

#### 请求示例

```bash
curl https://api.claudehome.cn/api/v8/skills/user \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 响应示例

```json
{
  "skills": [
    {
      "id": "typescript-skill",
      "name_en": "TypeScript Helper",
      "version": "1.0.0",
      "installed_at": "2025-01-15T10:00:00Z",
      "last_used": "2025-01-22T14:30:00Z",
      "usage_count": 45,
      "enabled": true
    }
  ],
  "quota": {
    "max_skills": 50,
    "used_skills": 12,
    "remaining_skills": 38
  }
}
```

---

### 8. 安装技能

**端点**: `POST /api/v8/skills/user/install`
**认证**: **需要** Bearer Token
**用途**: 安装技能到用户账户

#### 请求示例

```bash
curl -X POST https://api.claudehome.cn/api/v8/skills/user/install \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skill_id": "typescript-skill",
    "version": "1.0.0",
    "enabled": true
  }'
```

#### 请求体

```typescript
interface InstallSkillRequest {
  skill_id: string
  version?: string    // 不指定则安装最新版本
  enabled?: boolean   // 安装后是否启用（默认 true）
}
```

#### 响应示例

```json
{
  "success": true,
  "skill": {
    "id": "typescript-skill",
    "version": "1.0.0",
    "installed_at": "2025-01-23T10:00:00Z",
    "enabled": true
  },
  "quota": {
    "max_skills": 50,
    "used_skills": 13,
    "remaining_skills": 37
  }
}
```

---

### 9. 卸载技能

**端点**: `DELETE /api/v8/skills/user/uninstall`
**认证**: **需要** Bearer Token
**用途**: 从用户账户卸载技能

#### 请求示例

```bash
curl -X DELETE https://api.claudehome.cn/api/v8/skills/user/uninstall \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skill_id": "typescript-skill"
  }'
```

#### 请求体

```typescript
interface UninstallSkillRequest {
  skill_id: string
}
```

#### 响应示例

```json
{
  "success": true,
  "message": "Skill uninstalled successfully",
  "quota": {
    "max_skills": 50,
    "used_skills": 12,
    "remaining_skills": 38
  }
}
```

---

### 10. 获取模板分类

**端点**: `GET /api/v8/templates/categories`
**认证**: 不需要
**用途**: 获取所有模板分类列表

#### 请求示例

```bash
curl "https://api.claudehome.cn/api/v8/templates/categories"
```

#### 响应示例

```json
{
  "categories": [
    {
      "id": "frontend",
      "name_en": "Frontend Development",
      "name_zh_cn": "前端开发",
      "description_en": "Tools for frontend development",
      "description_zh_cn": "前端开发工具",
      "count": 45,
      "icon": "🎨"
    },
    {
      "id": "backend",
      "name_en": "Backend Development",
      "name_zh_cn": "后端开发",
      "count": 38,
      "icon": "⚙️"
    }
  ]
}
```

---

### 11. 热门模板

**端点**: `GET /api/v8/templates/trending`
**认证**: 不需要
**用途**: 获取热门模板列表

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | ❌ | 模板类型过滤 |
| period | string | ❌ | 时间范围: `day`, `week`, `month` (默认 `week`) |
| limit | number | ❌ | 返回数量 (默认 10，最大 50) |

#### 响应格式

与 `/api/v8/templates` 响应格式相同

---

### 12. 精选模板

**端点**: `GET /api/v8/templates/featured`
**认证**: 不需要
**用途**: 获取官方精选模板

#### 响应格式

与 `/api/v8/templates` 响应格式相同

---

### 13. 版本历史

**端点**: `GET /api/v8/templates/{id}/versions`
**认证**: 不需要
**用途**: 获取模板的版本历史

#### 响应示例

```json
{
  "template_id": "react-dev-agent",
  "versions": [
    {
      "version": "1.2.0",
      "released_at": "2025-01-20T15:30:00Z",
      "changelog": "Added TypeScript 5.0 support",
      "breaking_changes": false
    },
    {
      "version": "1.1.0",
      "released_at": "2024-12-15T10:00:00Z",
      "changelog": "Performance improvements",
      "breaking_changes": false
    }
  ]
}
```

---

### 14. 批量检查更新

**端点**: `POST /api/v8/templates/check-updates`
**认证**: 不需要
**用途**: 批量检查已安装模板的更新

#### 请求示例

```bash
curl -X POST https://api.claudehome.cn/api/v8/templates/check-updates \
  -H "Content-Type: application/json" \
  -d '{
    "installed": [
      {"id": "react-dev-agent", "version": "1.0.0"},
      {"id": "typescript-skill", "version": "0.9.0"}
    ]
  }'
```

#### 请求体

```typescript
interface CheckUpdatesRequest {
  installed: Array<{
    id: string
    version: string
  }>
}
```

#### 响应示例

```json
{
  "updates": [
    {
      "id": "react-dev-agent",
      "current_version": "1.0.0",
      "latest_version": "1.2.0",
      "update_available": true,
      "breaking_changes": false,
      "changelog": "Added TypeScript 5.0 support"
    },
    {
      "id": "typescript-skill",
      "current_version": "0.9.0",
      "latest_version": "0.9.0",
      "update_available": false
    }
  ]
}
```

---

### 15. 技能推荐

**端点**: `GET /api/v8/skills/suggestions`
**认证**: **需要** Bearer Token
**用途**: 基于用户已安装技能推荐相关技能

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| limit | number | ❌ | 返回数量 (默认 5) |

#### 响应格式

与 `/api/v8/templates` 响应格式相同，但包含 `relevance_score` 字段

---

### 16. MCP 包市场列表

**端点**: `GET /api/v8/mcp/marketplace`
**认证**: 不需要
**用途**: 浏览 MCP 包市场

#### 请求参数

与 `/api/v8/templates` 相同，但 `type` 固定为 `mcp`

#### 响应格式

与 `/api/v8/templates` 响应格式相同

---

### 17. 获取单个 MCP 包

**端点**: `GET /api/v8/mcp/{id}`
**认证**: 不需要
**用途**: 获取 MCP 包详细信息

#### 响应格式

与 `/api/v8/templates/{id}` 响应格式相同

---

### 18. 用户已安装 MCP

**端点**: `GET /api/v8/mcp/user`
**认证**: **需要** Bearer Token
**用途**: 获取用户已安装的 MCP 包列表

#### 响应格式

```json
{
  "mcps": [
    {
      "id": "postgres-mcp",
      "name_en": "PostgreSQL MCP",
      "version": "1.0.0",
      "installed_at": "2025-01-15T10:00:00Z",
      "enabled": true
    }
  ],
  "quota": {
    "max_mcps": 20,
    "used_mcps": 5,
    "remaining_mcps": 15
  }
}
```

---

### 19. 安装 MCP 包

**端点**: `POST /api/v8/mcp/user/install`
**认证**: **需要** Bearer Token
**用途**: 安装 MCP 包到用户账户

#### 请求体格式

与 `/api/v8/skills/user/install` 相同

---

### 20. 卸载 MCP 包

**端点**: `DELETE /api/v8/mcp/user/uninstall`
**认证**: **需要** Bearer Token
**用途**: 从用户账户卸载 MCP 包

#### 请求体格式

与 `/api/v8/skills/user/uninstall` 相同

---

### 21-23. Agent 用户管理

**端点**:
- `GET /api/v8/agents/user` - 获取已安装 Agent
- `POST /api/v8/agents/user/install` - 安装 Agent
- `DELETE /api/v8/agents/user/uninstall` - 卸载 Agent

**认证**: **需要** Bearer Token

#### 响应格式

与 Skills/MCP 用户管理接口格式相同

---

### 24-26. Hook 用户管理

**端点**:
- `GET /api/v8/hooks/user` - 获取已安装 Hook
- `POST /api/v8/hooks/user/install` - 安装 Hook
- `DELETE /api/v8/hooks/user/uninstall` - 卸载 Hook

**认证**: **需要** Bearer Token

#### 响应格式

与 Skills/MCP 用户管理接口格式相同

---

### 27. Hook 推荐

**端点**: `POST /api/v1/hooks/recommendations`
**认证**: 不需要
**用途**: 基于项目特征推荐 Hook

#### 请求示例

```bash
curl -X POST https://api.claudehome.cn/api/v1/hooks/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "projectType": "react",
    "frameworks": ["vite", "typescript"],
    "gitProvider": "github"
  }'
```

#### 响应示例

```json
{
  "recommendations": [
    {
      "id": "pre-commit-lint",
      "name_en": "Pre-commit Linting",
      "name_zh_cn": "提交前代码检查",
      "relevance_score": 0.92,
      "hook_type": "pre-commit",
      "install_command": "ccjk hooks add pre-commit-lint"
    }
  ]
}
```

---

### 28. 社区 Hook 列表

**端点**: `GET /api/v1/hooks/community`
**认证**: 不需要
**用途**: 获取社区贡献的 Hook 列表

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| category | string | ❌ | Hook 类型: `pre-commit`, `post-commit`, `pre-push` |
| limit | number | ❌ | 返回数量 |
| offset | number | ❌ | 偏移量 |

#### 响应格式

与 `/api/v8/templates` 响应格式相同

---

### 29. 获取评分

**端点**: `GET /api/v8/ratings/{type}/{id}`
**认证**: 不需要
**用途**: 获取模板的评分和评论

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| type | string | 模板类型: `agent`, `skill`, `mcp`, `hook` |
| id | string | 模板 ID |

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sortBy | string | ❌ | 排序: `newest`, `oldest`, `highest`, `lowest`, `helpful` |
| limit | number | ❌ | 返回数量 (默认 20) |
| offset | number | ❌ | 偏移量 |

#### 响应示例

```json
{
  "template_id": "react-dev-agent",
  "template_type": "agent",
  "summary": {
    "average_rating": 4.8,
    "total_ratings": 234,
    "distribution": {
      "5": 180,
      "4": 40,
      "3": 10,
      "2": 3,
      "1": 1
    }
  },
  "ratings": [
    {
      "id": "rating_123",
      "user_id": "user_456",
      "username": "john_doe",
      "rating": 5,
      "comment": "Excellent agent for React development!",
      "helpful_count": 15,
      "created_at": "2025-01-20T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 234,
    "limit": 20,
    "offset": 0
  }
}
```

---

### 30. 提交评分

**端点**: `POST /api/v8/ratings/{type}/{id}`
**认证**: **需要** Bearer Token
**用途**: 为模板提交评分和评论

#### 请求示例

```bash
curl -X POST https://api.claudehome.cn/api/v8/ratings/agent/react-dev-agent \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "comment": "Excellent agent for React development!"
  }'
```

#### 请求体

```typescript
interface CreateRatingRequest {
  rating: number        // 1-5 星
  comment?: string      // 可选评论
}
```

#### 响应示例

```json
{
  "success": true,
  "rating": {
    "id": "rating_123",
    "rating": 5,
    "comment": "Excellent agent for React development!",
    "created_at": "2025-01-23T10:00:00Z"
  }
}
```

---

### 31. 搜索建议

**端点**: `GET /api/v8/search/suggestions`
**认证**: 不需要
**用途**: 获取搜索自动补全建议

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | ✅ | 搜索关键词 (至少 2 个字符) |
| type | string | ❌ | 模板类型过滤 |
| limit | number | ❌ | 返回数量 (默认 5，最大 10) |

#### 响应示例

```json
{
  "suggestions": [
    {
      "text": "react development",
      "type": "query",
      "count": 45
    },
    {
      "text": "React Development Agent",
      "type": "template",
      "template_id": "react-dev-agent",
      "template_type": "agent"
    }
  ]
}
```

---

### 32. 用户登录

**端点**: `POST /api/v1/auth/login`
**认证**: 不需要
**用途**: 用户登录获取访问令牌

#### 请求示例

```bash
curl -X POST https://api.claudehome.cn/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "github",
    "code": "oauth_authorization_code"
  }'
```

#### 请求体

```typescript
interface LoginRequest {
  provider: 'github' | 'google' | 'microsoft'  // OAuth 提供商
  code: string                                  // OAuth 授权码
}
```

#### 响应示例

```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "username": "john_doe",
    "avatar_url": "https://avatars.githubusercontent.com/u/123"
  }
}
```

---

### 33. 用户登出

**端点**: `POST /api/v1/auth/logout`
**认证**: **需要** Bearer Token
**用途**: 用户登出，使令牌失效

#### 响应示例

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 34. 刷新 Token

**端点**: `POST /api/v1/auth/refresh`
**认证**: **需要** Refresh Token
**用途**: 使用 refresh token 获取新的 access token

#### 请求示例

```bash
curl -X POST https://api.claudehome.cn/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

#### 响应格式

与 `/api/v1/auth/login` 响应格式相同

---

### 35. 获取用户信息

**端点**: `GET /api/v1/auth/me`
**认证**: **需要** Bearer Token
**用途**: 获取当前登录用户信息

#### 响应示例

```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "username": "john_doe",
    "avatar_url": "https://avatars.githubusercontent.com/u/123",
    "created_at": "2024-01-15T10:00:00Z",
    "quota": {
      "max_skills": 50,
      "max_mcps": 20,
      "max_agents": 10,
      "max_hooks": 30
    }
  }
}
```

---

### 36. 事件追踪

**端点**: `POST /api/v1/telemetry/events`
**认证**: 不需要
**用途**: 上报用户行为事件（非阻塞）

#### 请求示例

```bash
curl -X POST https://api.claudehome.cn/api/v1/telemetry/events \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "event_type": "template_view",
        "template_id": "react-dev-agent",
        "timestamp": "2025-01-23T10:00:00Z",
        "metadata": {
          "source": "cli",
          "version": "8.2.0"
        }
      }
    ]
  }'
```

#### 请求体

```typescript
interface TelemetryEventsRequest {
  events: Array<{
    event_type: string
    template_id?: string
    skill_id?: string
    timestamp: string
    metadata?: Record<string, unknown>
  }>
}
```

---

### 37. 错误上报

**端点**: `POST /api/v1/telemetry/errors`
**认证**: 不需要
**用途**: 上报客户端错误（非阻塞）

#### 请求示例

```bash
curl -X POST https://api.claudehome.cn/api/v1/telemetry/errors \
  -H "Content-Type: application/json" \
  -d '{
    "error_type": "installation_failed",
    "message": "Failed to install skill: network timeout",
    "stack_trace": "Error: ...",
    "context": {
      "skill_id": "typescript-skill",
      "cli_version": "8.2.0",
      "platform": "darwin"
    },
    "timestamp": "2025-01-23T10:00:00Z"
  }'
```

---

### 38. 上报使用数据

**端点**: `POST /api/v1/usage/current`
**认证**: 不需要
**用途**: 上报使用统计（非阻塞，5 秒超时）

#### 请求示例

```bash
curl -X POST https://api.claudehome.cn/api/v1/usage/current \
  -H "Content-Type: application/json" \
  -d '{
    "metricType": "skill_usage",
    "skillId": "typescript-skill",
    "timestamp": "2025-01-23T10:00:00Z",
    "metadata": {
      "duration_ms": 1500,
      "success": true
    }
  }'
```

#### 请求体

```typescript
interface UsageReport {
  metricType: 'skill_usage' | 'agent_usage' | 'template_download' | 'error'
  skillId?: string
  agentId?: string
  templateId?: string
  timestamp: string
  metadata?: Record<string, unknown>
}
```

#### 响应示例

```json
{
  "success": true,
  "message": "Usage data recorded"
}
```

---

## 数据模型

### 核心实体关系

```
User (用户)
  ├── UserSkills (已安装技能)
  │   ├── skill_id
  │   ├── installed_at
  │   ├── last_used
  │   └── usage_count
  └── Quota (配额)
      ├── max_skills
      └── used_skills

Template (模板)
  ├── id (唯一标识)
  ├── type (agent/skill/mcp/hook)
  ├── content (模板内容)
  ├── metadata (元数据)
  └── stats (统计数据)

Recommendation (推荐)
  ├── template_id
  ├── relevance_score
  └── reason
```

---

## 认证与授权

### Bearer Token 认证

需要认证的接口在请求头中包含：

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Token 获取方式

1. **CLI 登录**: `ccjk auth login`
2. **Web 登录**: 访问 `https://claudehome.cn/login`
3. **OAuth**: 支持 GitHub/Google/Microsoft

### Token 存储

CLI 将 token 存储在：
- macOS/Linux: `~/.ccjk/auth.json`
- Windows: `%USERPROFILE%\.ccjk\auth.json`

---

## 错误处理

### 统一错误格式

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Template not found",
    "details": {
      "template_id": "invalid-id"
    }
  }
}
```

### 错误码列表

| HTTP 状态 | 错误码 | 说明 |
|-----------|--------|------|
| 400 | `INVALID_REQUEST` | 请求参数错误 |
| 401 | `UNAUTHORIZED` | 未认证或 token 无效 |
| 403 | `FORBIDDEN` | 无权限访问 |
| 404 | `RESOURCE_NOT_FOUND` | 资源不存在 |
| 409 | `CONFLICT` | 资源冲突（如重复安装） |
| 429 | `RATE_LIMIT_EXCEEDED` | 请求频率超限 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |
| 503 | `SERVICE_UNAVAILABLE` | 服务暂时不可用 |

### 重试策略

CLI 对以下错误码自动重试（指数退避）：
- `429` - Rate Limit
- `500` - Internal Error
- `503` - Service Unavailable
- 网络超时

重试延迟：100ms → 200ms → 400ms → 800ms

---

## 性能要求

### 响应时间 (P95)

| 端点 | 目标延迟 | 说明 |
|------|----------|------|
| `/health` | < 100ms | 健康检查必须快速 |
| `/api/v1/specs` | < 2s | 项目分析可能较慢 |
| `/api/v8/templates` | < 500ms | 列表查询 |
| `/api/v8/templates/{id}` | < 300ms | 单个模板 |
| `/api/v8/templates/batch` | < 1s | 批量查询 |
| `/api/v1/usage/current` | < 200ms | 遥测数据上报 |

### 并发要求

- **QPS**: 1000+ (峰值)
- **并发连接**: 5000+
- **可用性**: 99.9%

### 缓存策略

建议对以下数据启用缓存：

| 数据类型 | TTL | 说明 |
|----------|-----|------|
| 模板列表 | 5 分钟 | 更新不频繁 |
| 模板详情 | 1 小时 | 内容稳定 |
| 推荐结果 | 10 分钟 | 基于项目特征 |
| 用户技能 | 无缓存 | 实时数据 |

---

## 附录

### A. 测试端点

为方便开发测试，建议提供以下测试端点：

```bash
# 测试项目分析
curl -X POST https://api.claudehome.cn/api/v1/specs \
  -H "Content-Type: application/json" \
  -d '{"projectRoot": "/test", "dependencies": {"react": "^18.0.0"}}'

# 测试模板列表
curl "https://api.claudehome.cn/api/v8/templates?type=agent&limit=5"

# 测试健康检查
curl https://api.claudehome.cn/health
```

### B. 示例响应数据

完整的示例响应数据已在各接口规范中提供。

### C. 版本演进

- **v1**: 基础 API（项目分析、使用统计）
- **v8**: 统一模板系统（Agent/Skill/MCP/Hook）
- **未来**: 考虑 GraphQL 支持

### D. 联系方式

- **技术支持**: support@claudehome.cn
- **API 文档**: https://docs.claudehome.cn/api
- **GitHub**: https://github.com/ccjk/ccjk-public

---

## 总结

本文档定义了 CCJK Cloud API 的完整规范，包括：

- **38 个 API 端点**，覆盖模板管理、用户认证、市场浏览、评分系统、遥测追踪
- **4 种模板类型**：Agent、Skill、MCP、Hook
- **统一的 v8 模板系统**，简化客户端集成
- **完善的认证机制**，支持 OAuth 和 Token 刷新
- **详细的错误处理**，包含重试策略和错误码

### 必须实现的端点 (P0)

1. `GET /health` - 健康检查
2. `POST /api/v1/specs` - 项目分析与推荐
3. `GET /api/v8/templates` - 列出模板
4. `GET /api/v8/templates/{id}` - 获取单个模板
5. `POST /api/v1/auth/login` - 用户登录
6. `POST /api/v1/auth/refresh` - 刷新 Token

### 建议实现的端点 (P1)

**模板管理**:
- `POST /api/v8/templates/batch` - 批量获取模板
- `GET /api/v8/templates/categories` - 获取分类
- `GET /api/v8/templates/trending` - 热门模板
- `GET /api/v8/templates/featured` - 精选模板
- `GET /api/v8/templates/{id}/versions` - 版本历史
- `POST /api/v8/templates/check-updates` - 检查更新

**Skills 管理**:
- `GET /api/v8/skills/marketplace` - 技能市场
- `GET /api/v8/skills/user` - 用户技能列表
- `POST /api/v8/skills/user/install` - 安装技能
- `DELETE /api/v8/skills/user/uninstall` - 卸载技能
- `GET /api/v8/skills/suggestions` - 技能推荐

**MCP 管理**:
- `GET /api/v8/mcp/marketplace` - MCP 市场
- `GET /api/v8/mcp/{id}` - 获取 MCP 详情
- `GET /api/v8/mcp/user` - 用户 MCP 列表
- `POST /api/v8/mcp/user/install` - 安装 MCP
- `DELETE /api/v8/mcp/user/uninstall` - 卸载 MCP

**Agent 管理**:
- `GET /api/v8/agents/user` - 用户 Agent 列表
- `POST /api/v8/agents/user/install` - 安装 Agent
- `DELETE /api/v8/agents/user/uninstall` - 卸载 Agent

**Hook 管理**:
- `GET /api/v8/hooks/user` - 用户 Hook 列表
- `POST /api/v8/hooks/user/install` - 安装 Hook
- `DELETE /api/v8/hooks/user/uninstall` - 卸载 Hook
- `POST /api/v1/hooks/recommendations` - Hook 推荐
- `GET /api/v1/hooks/community` - 社区 Hook

**评分系统**:
- `GET /api/v8/ratings/{type}/{id}` - 获取评分
- `POST /api/v8/ratings/{type}/{id}` - 提交评分

**认证相关**:
- `POST /api/v1/auth/logout` - 用户登出
- `GET /api/v1/auth/me` - 获取用户信息

### 可选实现的端点 (P2)

**搜索与发现**:
- `GET /api/v8/search/suggestions` - 搜索建议

**遥测追踪**:
- `POST /api/v1/telemetry/events` - 事件追踪
- `POST /api/v1/telemetry/errors` - 错误上报
- `POST /api/v1/usage/current` - 使用统计

---

**文档版本**: v2.0
**最后更新**: 2025-01-23
**变更说明**: 补充了 MCP/Agent/Hook 管理接口、认证系统、评分系统、搜索建议等完整功能
**最后更新**: 2025-01-23
**维护者**: CCJK Team