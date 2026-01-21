# API Endpoints Reference

**Version**: v3.8.0
**Base URL**: `https://api.claudehome.cn/api/v1`
**Last Updated**: 2026-01-21

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Cloud Sync Endpoints](#cloud-sync-endpoints)
5. [Skill Registry Endpoints](#skill-registry-endpoints)
6. [Agent Orchestration Endpoints](#agent-orchestration-endpoints)
7. [MCP Service Endpoints](#mcp-service-endpoints)
8. [Plugin Marketplace Endpoints](#plugin-marketplace-endpoints)
9. [Error Codes](#error-codes)
10. [Webhooks](#webhooks)

---

## Overview

The CCJK Cloud API provides endpoints for:

- **Cloud Sync**: Cross-device configuration synchronization
- **Skill Registry**: Community-driven skill marketplace
- **Agent Orchestration**: Multi-agent coordination and scaling
- **MCP Services**: Cloud-based MCP service discovery and management
- **Plugin Marketplace**: Plugin distribution and recommendations

### Base URL Structure

```
Production: https://api.claudehome.cn/api/v1
Staging:     https://api-staging.claudehome.cn/api/v1
Development: http://localhost:3000/api/v1
```

---

## Authentication

### API Key Authentication

Most endpoints require an API key for authentication.

```http
Authorization: Bearer <your-api-key>
```

#### Obtaining an API Key

```bash
# Generate new API key
npx ccjk cloud api-key create

# List existing keys
npx ccjk cloud api-key list

# Revoke key
npx ccjk cloud api-key revoke <key-id>
```

### Anonymous Access

The following endpoints support anonymous access (with rate limits):

- `GET /plugins` - Browse public plugins
- `GET /skills` - Browse public skills
- `GET /agents` - Browse public agents
- `GET /mcp/services` - Browse MCP services

### OAuth 2.0 (Enterprise)

For enterprise customers, OAuth 2.0 is supported:

```http
POST /oauth/token
  ?grant_type=client_credentials
  &client_id=<client-id>
  &client_secret=<client-secret>
```

---

## Rate Limiting

### Default Limits

| Plan | Requests/Hour | Requests/Minute | Concurrent |
|:-----|--------------:|---------------:|-----------:|
| Free | 1,000 | 60 | 5 |
| Pro | 10,000 | 300 | 25 |
| Enterprise | Unlimited | 1,000 | 100 |

### Rate Limit Headers

All API responses include rate limit information:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1705845600
X-RateLimit-Reset-InSeconds: 300
```

### Retry-After Header

When rate limited, the response includes:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Retry-After: 60
```

### Rate Limit Strategies

#### Exponential Backoff

```typescript
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url)
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5')
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
        continue
      }
      return response
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }
}
```

---

## Cloud Sync Endpoints

### Sync Configuration

#### POST /sync/config

Set or update sync configuration.

**Request Body:**
```json
{
  "provider": "github-gist" | "s3" | "webdav" | "custom",
  "providerConfig": {
    "token": "string (optional)",
    "endpoint": "string (optional)",
    "credentials": {
      "token": "string (optional)",
      "secretKey": "string (optional)",
      "username": "string (optional)",
      "password": "string (optional)"
    }
  },
  "syncDirection": "push" | "pull" | "bidirectional",
  "autoSyncInterval": 0,  // milliseconds, 0 = disabled
  "conflictStrategy": "local-wins" | "remote-wins" | "newest-wins" | "manual",
  "itemTypes": ["skills", "workflows", "settings", "mcp-configs"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "configId": "sync_abc123",
    "status": "active",
    "lastSync": "2026-01-21T10:00:00Z",
    "nextSync": "2026-01-21T11:00:00Z"
  }
}
```

#### GET /sync/config

Retrieve current sync configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "provider": "github-gist",
    "syncDirection": "bidirectional",
    "autoSyncInterval": 3600000,
    "conflictStrategy": "newest-wins",
    "itemTypes": ["skills", "workflows", "settings", "mcp-configs"],
    "lastSync": "2026-01-21T10:00:00Z",
    "stats": {
      "totalSynced": 150,
      "pushed": 45,
      "pulled": 105,
      "conflicts": 2
    }
  }
}
```

### Sync Operations

#### POST /sync/sync

Trigger a sync operation.

**Request Body:**
```json
{
  "direction": "bidirectional",  // optional, overrides config
  "itemTypes": ["skills"],  // optional, specific items to sync
  "force": false  // skip conflict detection
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "syncId": "sync_xyz789",
    "status": "in_progress",
    "startedAt": "2026-01-21T10:30:00Z",
    "estimatedDuration": 30
  }
}
```

#### GET /sync/status

Get sync operation status.

**Response:**
```json
{
  "success": true,
  "data": {
    "syncId": "sync_xyz789",
    "status": "completed",
    "progress": 100,
    "results": {
      "pushed": [
        {"id": "skill-1", "type": "skills", "size": 1024}
      ],
      "pulled": [
        {"id": "skill-2", "type": "skills", "size": 2048}
      ],
      "conflicts": [],
      "errors": []
    },
    "startedAt": "2026-01-21T10:30:00Z",
    "completedAt": "2026-01-21T10:30:15Z",
    "duration": 15
  }
}
```

#### POST /sync/resolve-conflict

Resolve a sync conflict.

**Request Body:**
```json
{
  "conflictId": "conflict_123",
  "resolution": "local" | "remote" | "merged",
  "mergedContent": "string (if resolution=merged)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conflictId": "conflict_123",
    "resolved": true,
    "appliedAt": "2026-01-21T10:35:00Z"
  }
}
```

---

## Skill Registry Endpoints

### List Skills

#### GET /skills

List all available skills with optional filtering.

**Query Parameters:**
| Parameter | Type | Required | Description |
|:----------|:-----|:--------|:------------|
| `category` | string | No | Filter by category |
| `search` | string | No | Search query |
| `tags` | string[] | No | Filter by tags |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |
| `sort` | string | No | Sort: `popular`, `newest`, `updated`, `name` |
| `lang` | string | No | Language: `en`, `zh-CN` (default: `en`) |

**Response:**
```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "id": "code-reviewer",
        "name": "Code Review Assistant",
        "description": "AI-powered code review with security analysis",
        "category": "review",
        "version": "2.1.0",
        "author": "CCJK Team",
        "tags": ["review", "security", "quality"],
        "triggers": ["/review", "/code-review"],
        "popularity": 5000,
        "rating": 4.8,
        "downloads": 12500,
        "createdAt": "2024-06-15T10:00:00Z",
        "updatedAt": "2026-01-10T08:00:00Z",
        "compatibility": {
          "ccjk": ">=3.7.0",
          "claudeCode": ">=1.0.0"
        }
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

### Get Skill Details

#### GET /skills/{id}

Get detailed information about a specific skill.

**Path Parameters:**
| Parameter | Type | Description |
|:----------|:-----|:------------|
| `id` | string | Skill ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "code-reviewer",
    "name": {
      "en": "Code Review Assistant",
      "zh-CN": "代码审查助手"
    },
    "description": {
      "en": "AI-powered code review with security analysis",
      "zh-CN": "AI 驱动的代码审查，包含安全分析"
    },
    "longDescription": "## Overview\n\nComprehensive code review...",
    "category": "review",
    "version": "2.1.0",
    "author": "CCJK Team",
    "license": "MIT",
    "tags": ["review", "security", "quality"],
    "triggers": ["/review", "/code-review"],
    "template": "# Code Review Skill\n\n<!-- Skill content -->",
    "agents": ["security-specialist", "performance-analyzer"],
    "dependencies": [],
    "popularity": 5000,
    "rating": 4.8,
    "ratingCount": 234,
    "downloads": 12500,
    "homepage": "https://github.com/ccjk/code-reviewer",
    "repository": "https://github.com/ccjk/code-reviewer",
    "icon": "https://cdn.claudehome.cn/skills/code-reviewer/icon.png",
    "screenshots": [
      "https://cdn.claudehome.cn/skills/code-reviewer/screenshot1.png"
    ],
    "compatibility": {
      "ccjk": ">=3.7.0",
      "claudeCode": ">=1.0.0"
    },
    "permissions": ["file:read", "file:write"],
    "createdAt": "2024-06-15T10:00:00Z",
    "updatedAt": "2026-01-10T08:00:00Z",
    "versions": [
      {"version": "2.1.0", "releaseDate": "2026-01-10", "changelog": "Added security analysis"},
      {"version": "2.0.0", "releaseDate": "2025-12-01", "changelog": "Major rewrite"}
    ]
  }
}
```

### Install Skill

#### POST /skills/{id}/install

Install a skill from the registry.

**Path Parameters:**
| Parameter | Type | Description |
|:----------|:-----|:------------|
| `id` | string | Skill ID |

**Request Body:**
```json
{
  "version": "latest",  // or specific version
  "force": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "skillId": "code-reviewer",
    "version": "2.1.0",
    "installedPath": "/Users/user/.ccjk/skills/code-reviewer.md",
    "installedAt": "2026-01-21T10:00:00Z",
    "dependenciesInstalled": ["security-analyzer"]
  }
}
```

### Publish Skill

#### POST /skills/publish

Publish a new skill to the registry.

**Request Body:**
```json
{
  "skill": {
    "id": "my-custom-skill",
    "name": {"en": "My Custom Skill", "zh-CN": "我的自定义技能"},
    "description": {"en": "Description", "zh-CN": "描述"},
    "category": "custom",
    "version": "1.0.0",
    "tags": ["custom"],
    "triggers": ["/my-skill"],
    "template": "# Skill Content\n\n..."
  },
  "visibility": "public" | "private" | "unlisted"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "skillId": "my-custom-skill",
    "version": "1.0.0",
    "status": "pending_review",
    "submittedAt": "2026-01-21T10:00:00Z",
    "reviewUrl": "https://claudehome.cn/skills/my-custom-skill/review"
  }
}
```

### Skill Categories

#### GET /skills/categories

Get all skill categories.

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "git",
        "name": {"en": "Git", "zh-CN": "Git 工具"},
        "description": {"en": "Version control workflows", "zh-CN": "版本控制工作流"},
        "icon": "🔀",
        "count": 25
      },
      {
        "id": "dev",
        "name": {"en": "Development", "zh-CN": "开发工具"},
        "description": {"en": "Code creation and refactoring", "zh-CN": "代码创建和重构"},
        "icon": "🛠️",
        "count": 45
      }
    ]
  }
}
```

---

## Agent Orchestration Endpoints

### List Agents

#### GET /agents

List all available agents.

**Query Parameters:**
| Parameter | Type | Required | Description |
|:----------|:-----|:--------|:------------|
| `status` | string | No | Filter by status: `available`, `busy`, `offline` |
| `role` | string | No | Filter by role |
| `page` | number | No | Page number |
| `limit` | number | No | Items per page |

**Response:**
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "agent_ts-architect_001",
        "role": "typescript-cli-architect",
        "model": "sonnet",
        "status": "available",
        "capabilities": ["cli-design", "typescript", "architecture"],
        "currentTask": null,
        "load": 0.2,
        "lastActivity": "2026-01-21T10:00:00Z",
        "metrics": {
          "tasksCompleted": 150,
          "avgResponseTime": 2500,
          "successRate": 0.98
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 13
    }
  }
}
```

### Create Agent Task

#### POST /agents/tasks

Create a new task for an agent.

**Request Body:**
```json
{
  "agentRole": "typescript-cli-architect",
  "task": {
    "name": "Design CLI structure",
    "description": "Create CLI command structure for new feature",
    "type": "design",
    "priority": "high",
    "input": {
      "feature": "cloud-sync",
      "commands": ["sync", "config", "status"]
    },
    "deadline": "2026-01-21T12:00:00Z"
  },
  "distributed": false  // Use cloud agent pool
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "task_abc123",
    "agentId": "agent_ts-architect_001",
    "status": "queued",
    "estimatedDuration": 300,
    "createdAt": "2026-01-21T10:00:00Z",
    "webhookUrl": "https://api.claudehome.cn/webhooks/tasks/task_abc123"
  }
}
```

### Get Task Status

#### GET /agents/tasks/{id}

Get the status of an agent task.

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "task_abc123",
    "status": "in_progress",
    "progress": 65,
    "agentId": "agent_ts-architect_001",
    "startedAt": "2026-01-21T10:00:00Z",
    "estimatedCompletion": "2026-01-21T10:05:00Z",
    "output": {
      "files": ["src/commands/sync.ts"],
      "messages": ["Created sync command structure"]
    }
  }
}
```

### Cancel Task

#### DELETE /agents/tasks/{id}

Cancel a running or queued task.

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "task_abc123",
    "status": "cancelled",
    "cancelledAt": "2026-01-21T10:03:00Z"
  }
}
```

### Agent Pool Management

#### POST /agents/pool/scale

Scale the agent pool.

**Request Body:**
```json
{
  "role": "typescript-cli-architect",
  "min": 2,
  "max": 10,
  "target": 5,
  "autoScale": true,
  "scaleUpThreshold": 0.7,
  "scaleDownThreshold": 0.3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "poolId": "pool_ts-architect",
    "current": 5,
    "status": "scaling",
    "target": 5,
    "estimatedReady": "2026-01-21T10:01:00Z"
  }
}
```

---

## MCP Service Endpoints

### List MCP Services

#### GET /mcp/services

List all available MCP services.

**Query Parameters:**
| Parameter | Type | Required | Description |
|:----------|:-----|:--------|:------------|
| `category` | string | No | Filter by category |
| `platform` | string | No | Filter by platform: `windows`, `macos`, `linux` |
| `search` | string | No | Search query |

**Response:**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": "context7",
        "name": {"en": "Context7", "zh-CN": "Context7 文档"},
        "description": {"en": "Upstash documentation service", "zh-CN": "Upstash 文档服务"},
        "category": "documentation",
        "version": "1.2.0",
        "author": "Upstash",
        "requiresApiKey": false,
        "platforms": ["windows", "macos", "linux"],
        "config": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "@upstash/context7-mcp@latest"]
        },
        "popularity": 5000,
        "rating": 4.9
      }
    ]
  }
}
```

### Get MCP Service Details

#### GET /mcp/services/{id}

Get detailed information about an MCP service.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "context7",
    "name": {"en": "Context7", "zh-CN": "Context7"},
    "description": {"en": "...", "zh-CN": "..."},
    "longDescription": "## Overview\n\n...",
    "category": "documentation",
    "version": "1.2.0",
    "author": "Upstash",
    "homepage": "https://context7.upstash.com",
    "repository": "https://github.com/upstash/context7-mcp",
    "requiresApiKey": false,
    "platforms": ["windows", "macos", "linux"],
    "config": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"],
      "env": {}
    },
    "capabilities": ["documentation", "code-search", "context-retrieval"],
    "permissions": [],
    "dependencies": [],
    "tools": [
      {"name": "get_library_docs", "description": "Get library docs"}
    ],
    "icon": "https://cdn.claudehome.cn/mcp/context7/icon.png",
    "popularity": 5000,
    "rating": 4.9,
    "downloads": 25000,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  }
}
```

### Install MCP Service

#### POST /mcp/services/{id}/install

Install an MCP service.

**Response:**
```json
{
  "success": true,
  "data": {
    "serviceId": "context7",
    "installedAt": "2026-01-21T10:00:00Z",
    "configPath": "/Users/user/.claude/mcp.json",
    "status": "active"
  }
}
```

### Discover MCP Services

#### POST /mcp/discover

Discover recommended MCP services based on project analysis.

**Request Body:**
```json
{
  "projectPath": "/Users/user/projects/my-app",
  "analysis": {
    "languages": ["typescript", "python"],
    "frameworks": ["react", "fastapi"],
    "packageManager": "pnpm"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "serviceId": "context7",
        "reason": " detected TypeScript project",
        "confidence": 0.95
      },
      {
        "serviceId": "sqlite",
        "reason": "Local database for development",
        "confidence": 0.85
      }
    ]
  }
}
```

---

## Plugin Marketplace Endpoints

### List Plugins

#### GET /plugins

List all available plugins.

**Query Parameters:**
| Parameter | Type | Required | Description |
|:----------|:-----|:--------|:------------|
| `category` | string | No | Filter by category |
| `search` | string | No | Search query |
| `tags` | string[] | No | Filter by tags |
| `page` | number | No | Page number |
| `limit` | number | No | Items per page |
| `sort` | string | No | Sort: `popular`, `newest`, `updated`, `rating` |

**Response:**
```json
{
  "success": true,
  "data": {
    "plugins": [
      {
        "id": "git-workflow-pro",
        "name": {"en": "Git Workflow Pro", "zh-CN": "Git 工作流专业版"},
        "description": {"en": "...", "zh-CN": "..."},
        "category": "dev",
        "version": "1.2.0",
        "author": "CCJK Team",
        "tags": ["git", "workflow", "automation"],
        "downloads": 1500,
        "rating": 4.8,
        "size": 102400,
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2026-01-10T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 85,
      "totalPages": 5
    }
  }
}
```

### Get Plugin Details

#### GET /plugins/{id}

Get detailed plugin information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "git-workflow-pro",
    "name": {"en": "Git Workflow Pro", "zh-CN": "Git 工作流专业版"},
    "description": {"en": "...", "zh-CN": "..."},
    "longDescription": "## Overview\n\n...",
    "category": "dev",
    "version": "1.2.0",
    "author": "CCJK Team",
    "license": "MIT",
    "tags": ["git", "workflow", "automation"],
    "downloads": 1500,
    "rating": 4.8,
    "ratingCount": 45,
    "size": 102400,
    "skills": [
      {"id": "git-commit", "name": "Smart Git Commit"}
    ],
    "agents": [],
    "mcpServices": [],
    "workflows": [],
    "homepage": "https://github.com/ccjk/git-workflow-pro",
    "repository": "https://github.com/ccjk/git-workflow-pro",
    "icon": "https://cdn.claudehome.cn/plugins/git-workflow-pro/icon.png",
    "screenshots": [],
    "compatibility": {
      "ccjk": ">=3.7.0",
      "claudeCode": ">=1.0.0"
    },
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z",
    "versions": [
      {"version": "1.2.0", "releaseDate": "2026-01-10", "changelog": "..."}
    ]
  }
}
```

### Download Plugin

#### GET /plugins/{id}/download

Get plugin download information.

**Response:**
```json
{
  "success": true,
  "data": {
    "pluginId": "git-workflow-pro",
    "version": "1.2.0",
    "downloadUrl": "https://cdn.claudehome.cn/plugins/git-workflow-pro/git-workflow-pro-1.2.0.tgz",
    "sha256": "abc123...",
    "size": 102400,
    "installInstructions": {
      "type": "npm",
      "command": "npx ccjk plugin install git-workflow-pro"
    },
    "files": [
      {"path": "skills/git-commit.md", "type": "skill"},
      {"path": "workflows/git.yml", "type": "workflow"}
    ]
  }
}
```

### Get Recommendations

#### POST /plugins/recommendations

Get personalized plugin recommendations.

**Request Body:**
```json
{
  "context": {
    "projectType": "nextjs",
    "language": "typescript",
    "frameworks": ["react", "next"],
    "tools": ["pnpm", "vitest"],
    "installedPlugins": ["git-workflow"],
    "skillLevel": "intermediate"
  },
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "plugin": {
          "id": "test-runner-plus",
          "name": {"en": "Test Runner Plus", "zh-CN": "测试运行器增强版"},
          "category": "testing",
          "downloads": 890,
          "rating": 4.5
        },
        "score": 0.92,
        "reason": {"en": "Vitest detected in project", "zh-CN": "项目中检测到 Vitest"},
        "confidence": 0.95
      }
    ],
    "total": 8
  }
}
```

---

## Error Codes

### Standard Error Response

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "messageZh": "中文错误信息",
    "details": {},
    "timestamp": "2026-01-21T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### Error Code Reference

| Code | HTTP Status | Description |
|:-----|:-----------:|:------------|
| `AUTH_INVALID` | 401 | Invalid or missing API key |
| `AUTH_EXPIRED` | 401 | API key has expired |
| `AUTH_INSUFFICIENT` | 403 | Insufficient permissions |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `RESOURCE_NOT_FOUND` | 404 | Resource not found |
| `RESOURCE_EXISTS` | 409 | Resource already exists |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `CONFLICT_DETECTED` | 409 | Sync conflict detected |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## Webhooks

### Webhook Configuration

#### POST /webhooks

Configure a webhook URL.

**Request Body:**
```json
{
  "url": "https://your-server.com/webhooks/ccjk",
  "events": ["sync.completed", "task.completed", "conflict.detected"],
  "secret": "your-webhook-secret"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "webhookId": "wh_abc123",
    "url": "https://your-server.com/webhooks/ccjk",
    "events": ["sync.completed", "task.completed", "conflict.detected"],
    "secret": "your-webhook-secret",
    "active": true
  }
}
```

### Webhook Events

#### sync.completed

Triggered when a sync operation completes.

```json
{
  "event": "sync.completed",
  "timestamp": "2026-01-21T10:00:00Z",
  "data": {
    "syncId": "sync_xyz789",
    "status": "completed",
    "results": {
      "pushed": 5,
      "pulled": 10,
      "conflicts": 0
    }
  }
}
```

#### task.completed

Triggered when an agent task completes.

```json
{
  "event": "task.completed",
  "timestamp": "2026-01-21T10:00:00Z",
  "data": {
    "taskId": "task_abc123",
    "status": "completed",
    "output": {...}
  }
}
```

#### conflict.detected

Triggered when a sync conflict is detected.

```json
{
  "event": "conflict.detected",
  "timestamp": "2026-01-21T10:00:00Z",
  "data": {
    "conflictId": "conflict_123",
    "itemId": "skill-code-reviewer",
    "type": "skills",
    "localVersion": {"version": "2.0.0", "modifiedAt": "..."},
    "remoteVersion": {"version": "2.1.0", "modifiedAt": "..."}
  }
}
```

### Webhook Security

Webhooks are signed with HMAC-SHA256.

```typescript
import { createHmac } from 'node:crypto'

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const hmac = createHmac('sha256', secret)
  hmac.update(payload)
  const digest = hmac.digest('hex')
  return signature === `sha256=${digest}`
}
```

---

**Document Version**: 1.0.0
**API Version**: v1
**Last Updated**: 2026-01-21
