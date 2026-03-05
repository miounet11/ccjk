# CCJK Cloud API 需求文档 v2.0

**版本**: v2.0
**日期**: 2025-01-23
**状态**: 🔴 紧急修复
**域名**: `https://api.claudehome.cn`

---

## 🚨 当前问题

**测试时间**: 2025-01-23
**测试结果**: 94 个端点中只有 2 个可用

### 已实现端点 ✅

```bash
# 1. 健康检查
curl https://api.claudehome.cn/health
# 返回: {"status":"healthy","version":"1.0.0","timestamp":"..."}

# 2. 技能列表
curl https://api.claudehome.cn/api/v8/skills
# 返回: {"success":true,"data":[...],"total":2}
```

### 缺失端点 ❌

所有以下端点返回 404：

```bash
# P0 核心端点 - 必须修复
curl -X POST https://api.claudehome.cn/api/v1/specs \
  -H 'Content-Type: application/json' \
  -d '{"projectRoot":"/test"}'
# 返回: {"message":"Route POST:/api/v1/specs not found","error":"Not Found","statusCode":404}

curl https://api.claudehome.cn/api/v8/templates
# 返回: {"message":"Route GET:/api/v1/templates not found","error":"Not Found","statusCode":404}

curl https://api.claudehome.cn/api/v8/templates/react-dev-agent
# 返回: {"success":false,"error":"Not found","path":"/api/v1/templates/react-dev-agent"}

curl -X POST https://api.claudehome.cn/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"provider":"github","code":"test"}'
# 返回: {"message":"Route POST:/api/v1/auth/login not found","error":"Not Found","statusCode":404}
```

---

## 📋 必须修复的端点清单

### P0 - 核心功能（必须立即实现）

| 端点 | 方法 | 测试命令 | 当前状态 |
|------|------|----------|----------|
| `/api/v1/specs` | POST | `curl -X POST https://api.claudehome.cn/api/v1/specs -H 'Content-Type: application/json' -d '{"projectRoot":"/test","dependencies":{"react":"^18.0.0"}}'` | ❌ 404 |
| `/api/v8/templates` | GET | `curl 'https://api.claudehome.cn/api/v8/templates?type=agent&limit=10'` | ❌ 404 |
| `/api/v8/templates/{id}` | GET | `curl https://api.claudehome.cn/api/v8/templates/react-dev-agent` | ❌ 404 |
| `/api/v1/auth/login` | POST | `curl -X POST https://api.claudehome.cn/api/v1/auth/login -H 'Content-Type: application/json' -d '{"provider":"github","code":"test123"}'` | ❌ 404 |
| `/api/v1/auth/refresh` | POST | `curl -X POST https://api.claudehome.cn/api/v1/auth/refresh -H 'Authorization: Bearer token123'` | ❌ 404 |

### P1 - 重要功能（建议实现）

| 端点 | 方法 | 测试命令 | 当前状态 |
|------|------|----------|----------|
| `/api/v8/templates/batch` | POST | `curl -X POST https://api.claudehome.cn/api/v8/templates/batch -H 'Content-Type: application/json' -d '{"ids":["react-dev-agent","typescript-skill"]}'` | ❌ 404 |
| `/api/v8/skills/marketplace` | GET | `curl https://api.claudehome.cn/api/v8/skills/marketplace` | ❌ 404 |
| `/api/v8/skills/user` | GET | `curl https://api.claudehome.cn/api/v8/skills/user -H 'Authorization: Bearer token123'` | ❌ 404 |
| `/api/v8/mcp/marketplace` | GET | `curl https://api.claudehome.cn/api/v8/mcp/marketplace` | ❌ 404 |
| `/api/v1/hooks/recommendations` | POST | `curl -X POST https://api.claudehome.cn/api/v1/hooks/recommendations -H 'Content-Type: application/json' -d '{"projectType":"react"}'` | ❌ 404 |

---

## 🔧 详细接口规范

### 1. 项目分析与推荐 (P0)

**端点**: `POST https://api.claudehome.cn/api/v1/specs`
**认证**: 不需要
**超时**: 10 秒

#### 请求示例

```bash
curl -X POST https://api.claudehome.cn/api/v1/specs \
  -H "Content-Type: application/json" \
  -H "User-Agent: CCJK/13.3.3" \
  -d '{
    "projectRoot": "/Users/user/my-project",
    "dependencies": {
      "react": "^18.0.0",
      "typescript": "^5.0.0",
      "vite": "^5.0.0"
    },
    "devDependencies": {
      "@types/react": "^18.0.0"
    },
    "gitRemote": "https://github.com/user/repo",
    "frameworks": ["react", "vite"],
    "languages": ["typescript"]
  }'
```

#### 期望响应 (200 OK)

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
    },
    {
      "id": "git-mcp",
      "name": {
        "en": "Git MCP Server",
        "zh-CN": "Git MCP 服务器"
      },
      "description": {
        "en": "Git operations via MCP",
        "zh-CN": "通过 MCP 执行 Git 操作"
      },
      "category": "mcp",
      "relevanceScore": 0.82,
      "config": {
        "command": "npx",
        "args": ["@modelcontextprotocol/server-git"]
      },
      "installCommand": "ccjk mcp add git",
      "tags": ["git", "version-control"]
    },
    {
      "id": "pre-commit-hook",
      "name": {
        "en": "Pre-commit Hook",
        "zh-CN": "提交前钩子"
      },
      "description": {
        "en": "Run linting before commit",
        "zh-CN": "提交前运行代码检查"
      },
      "category": "hook",
      "relevanceScore": 0.75,
      "config": {
        "event": "pre-commit",
        "command": "npm run lint"
      },
      "installCommand": "ccjk hooks add pre-commit",
      "tags": ["git", "linting"]
    }
  ]
}
```

#### 错误响应

```json
// 400 Bad Request
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "projectRoot is required",
    "requestId": "req_xyz789"
  }
}

// 500 Internal Server Error
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to analyze project",
    "requestId": "req_xyz789"
  }
}
```

---

### 2. 列出模板 (P0)

**端点**: `GET https://api.claudehome.cn/api/v8/templates`
**认证**: 不需要
**超时**: 5 秒

#### 请求示例

```bash
# 基础查询
curl 'https://api.claudehome.cn/api/v8/templates?type=agent&limit=10'

# 搜索查询
curl 'https://api.claudehome.cn/api/v8/templates?query=react&tags=frontend,typescript&sortBy=download_count&order=desc'

# 分类过滤
curl 'https://api.claudehome.cn/api/v8/templates?type=skill&category=testing&is_official=true'
```

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| type | string | ❌ | - | `agent`, `skill`, `mcp`, `hook` |
| category | string | ❌ | - | 分类过滤 |
| query | string | ❌ | - | 搜索关键词 |
| tags | string | ❌ | - | 标签（逗号分隔） |
| is_official | boolean | ❌ | false | 只显示官方模板 |
| is_featured | boolean | ❌ | false | 只显示精选模板 |
| sortBy | string | ❌ | updated_at | `name_en`, `download_count`, `rating_average`, `updated_at` |
| order | string | ❌ | desc | `asc`, `desc` |
| limit | number | ❌ | 20 | 每页数量（最大 100） |
| offset | number | ❌ | 0 | 偏移量 |

#### 期望响应 (200 OK)

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
    },
    {
      "id": "typescript-skill",
      "type": "skill",
      "name_en": "TypeScript Helper",
      "name_zh_cn": "TypeScript 助手",
      "description_en": "Type checking and refactoring tools",
      "description_zh_cn": "类型检查和重构工具",
      "category": "development",
      "tags": ["typescript", "type-checking", "refactoring"],
      "version": "2.1.0",
      "author": "CCJK Team",
      "is_official": true,
      "is_featured": false,
      "is_verified": true,
      "download_count": 8932,
      "rating_average": 4.6,
      "rating_count": 156,
      "repository_url": "https://github.com/ccjk/typescript-skill",
      "documentation_url": "https://docs.claudehome.cn/skills/typescript",
      "install_command": "ccjk skills add typescript-skill",
      "created_at": "2024-03-10T08:00:00Z",
      "updated_at": "2025-01-18T12:00:00Z"
    }
  ],
  "total": 156,
  "limit": 10,
  "offset": 0
}
```

---

### 3. 获取单个模板 (P0)

**端点**: `GET https://api.claudehome.cn/api/v8/templates/{id}`
**认证**: 不需要
**超时**: 5 秒

#### 请求示例

```bash
# 获取 Agent 模板
curl 'https://api.claudehome.cn/api/v8/templates/react-dev-agent?language=zh-CN'

# 获取 Skill 模板
curl 'https://api.claudehome.cn/api/v8/templates/typescript-skill?language=en'

# 获取 MCP 模板
curl 'https://api.claudehome.cn/api/v8/templates/git-mcp'

# 获取 Hook 模板
curl 'https://api.claudehome.cn/api/v8/templates/pre-commit-hook'
```

#### 期望响应 (200 OK)

```json
{
  "id": "react-dev-agent",
  "type": "agent",
  "name_en": "React Development Agent",
  "name_zh_cn": "React 开发助手",
  "description_en": "Specialized agent for React development with TypeScript support",
  "description_zh_cn": "专为 React 开发优化的智能助手，支持 TypeScript",
  "category": "frontend",
  "tags": ["react", "frontend", "typescript", "vite"],
  "version": "1.2.0",
  "author": "CCJK Team",

  "template_content": {
    "name": "react-dev",
    "persona": "You are a React expert with deep knowledge of modern React patterns, hooks, and TypeScript. You help developers write clean, performant, and maintainable React code.",
    "skills": ["react-hooks", "jsx-refactor", "component-generator"],
    "mcpServers": ["filesystem", "git"],
    "hooks": ["pre-commit"],
    "model": "claude-opus-4-6",
    "temperature": 0.7
  },

  "config_schema": {
    "type": "object",
    "properties": {
      "typescript": {
        "type": "boolean",
        "default": true,
        "description": "Enable TypeScript support"
      },
      "strictMode": {
        "type": "boolean",
        "default": true,
        "description": "Enable React strict mode"
      },
      "cssFramework": {
        "type": "string",
        "enum": ["tailwind", "styled-components", "css-modules"],
        "default": "tailwind",
        "description": "Preferred CSS framework"
      }
    }
  },

  "requirements": [
    "Node.js >= 18.0.0",
    "React >= 18.0.0",
    "TypeScript >= 5.0.0 (optional)"
  ],

  "compatibility": {
    "platforms": ["darwin", "linux", "win32"],
    "frameworks": ["react", "next.js", "remix", "vite"],
    "languages": ["typescript", "javascript"]
  },

  "usage_examples": [
    {
      "title": "Basic Setup",
      "description": "Install and configure the agent",
      "code": "ccjk agents add react-dev-agent\nccjk agents switch react-dev"
    },
    {
      "title": "Custom Configuration",
      "description": "Configure with custom settings",
      "code": "ccjk agents add react-dev-agent --config '{\"typescript\":true,\"cssFramework\":\"tailwind\"}'"
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

#### 错误响应

```json
// 404 Not Found
{
  "error": {
    "code": "TEMPLATE_NOT_FOUND",
    "message": "Template 'invalid-id' not found",
    "requestId": "req_xyz789"
  }
}
```

---

### 4. 批量获取模板 (P1)

**端点**: `POST https://api.claudehome.cn/api/v8/templates/batch`
**认证**: 不需要
**超时**: 10 秒

#### 请求示例

```bash
curl -X POST https://api.claudehome.cn/api/v8/templates/batch \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["react-dev-agent", "typescript-skill", "git-mcp", "pre-commit-hook"],
    "language": "zh-CN",
    "includeStats": true
  }'
```

#### 请求体

```json
{
  "ids": ["react-dev-agent", "typescript-skill", "git-mcp"],
  "language": "zh-CN",
  "includeStats": true
}
```

#### 期望响应 (200 OK)

```json
{
  "requestId": "batch_xyz789",
  "templates": {
    "react-dev-agent": {
      "id": "react-dev-agent",
      "type": "agent",
      "name_en": "React Development Agent",
      "name_zh_cn": "React 开发助手",
      "version": "1.2.0",
      "template_content": { /* ... */ }
    },
    "typescript-skill": {
      "id": "typescript-skill",
      "type": "skill",
      "name_en": "TypeScript Helper",
      "name_zh_cn": "TypeScript 助手",
      "version": "2.1.0",
      "template_content": { /* ... */ }
    },
    "git-mcp": {
      "id": "git-mcp",
      "type": "mcp",
      "name_en": "Git MCP Server",
      "name_zh_cn": "Git MCP 服务器",
      "version": "1.0.5",
      "template_content": { /* ... */ }
    }
  },
  "notFound": [],
  "stats": {
    "totalTemplates": 3,
    "cacheHits": 2,
    "cacheMisses": 1,
    "responseTime": 145
  }
}
```

---

### 5. 用户认证 - 登录 (P0)

**端点**: `POST https://api.claudehome.cn/api/v1/auth/login`
**认证**: 不需要
**超时**: 10 秒

#### 请求示例

```bash
# GitHub OAuth
curl -X POST https://api.claudehome.cn/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "github",
    "code": "github_oauth_code_here"
  }'

# Google OAuth
curl -X POST https://api.claudehome.cn/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "code": "google_oauth_code_here"
  }'
```

#### 请求体

```json
{
  "provider": "github",
  "code": "oauth_authorization_code"
}
```

#### 期望响应 (200 OK)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "tokenType": "Bearer",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://avatars.githubusercontent.com/u/123456",
    "provider": "github",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

#### 错误响应

```json
// 401 Unauthorized
{
  "error": {
    "code": "INVALID_CODE",
    "message": "Invalid or expired authorization code",
    "requestId": "req_xyz789"
  }
}

// 400 Bad Request
{
  "error": {
    "code": "INVALID_PROVIDER",
    "message": "Unsupported provider: 'invalid'",
    "requestId": "req_xyz789"
  }
}
```

---

### 6. 用户认证 - 刷新 Token (P0)

**端点**: `POST https://api.claudehome.cn/api/v1/auth/refresh`
**认证**: 需要 (Refresh Token)
**超时**: 5 秒

#### 请求示例

```bash
curl -X POST https://api.claudehome.cn/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

#### 请求体

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 期望响应 (200 OK)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

---

### 7. 技能市场 (P1)

**端点**: `GET https://api.claudehome.cn/api/v8/skills/marketplace`
**认证**: 不需要
**超时**: 5 秒

#### 请求示例

```bash
curl 'https://api.claudehome.cn/api/v8/skills/marketplace?limit=20&sortBy=download_count&order=desc'
```

#### 期望响应 (200 OK)

```json
{
  "items": [
    {
      "id": "typescript-skill",
      "name_en": "TypeScript Helper",
      "name_zh_cn": "TypeScript 助手",
      "description_en": "Type checking and refactoring tools",
      "description_zh_cn": "类型检查和重构工具",
      "version": "2.1.0",
      "author": "CCJK Team",
      "download_count": 8932,
      "rating_average": 4.6,
      "rating_count": 156,
      "install_command": "ccjk skills add typescript-skill",
      "tags": ["typescript", "type-checking"]
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}