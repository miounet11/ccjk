# CCJK 云服务 API 规范文档

> **版本**: 1.0.0
> **Base URL**: `https://api.claudehome.cn`
> **认证方式**: Header `X-Device-Token` 或 `Authorization: Bearer <token>`

---

## 目录

1. [设备管理 API](#1-设备管理-api)
2. [通知服务 API](#2-通知服务-api)
3. [插件推荐 API](#3-插件推荐-api)
4. [Skills 同步 API](#4-skills-同步-api)
5. [Agents 同步 API](#5-agents-同步-api)
6. [CLAUDE.md 同步 API](#6-claudemd-同步-api)
7. [Hooks 同步 API](#7-hooks-同步-api)
8. [通用响应格式](#8-通用响应格式)
9. [错误码说明](#9-错误码说明)

---

## 1. 设备管理 API

### 1.1 设备注册

注册新设备并获取访问令牌。

```
POST /device/register
```

**请求体**:
```json
{
  "name": "string (可选) - 设备名称",
  "platform": "string (必填) - 操作系统: darwin | linux | win32",
  "version": "string (必填) - CCJK 版本号",
  "config": {
    "enabled": "boolean - 是否启用通知",
    "threshold": "number - 任务时长阈值(分钟)",
    "channels": {}
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "string - 设备访问令牌",
    "deviceId": "string - 设备唯一标识",
    "registeredAt": "string - ISO 8601 时间戳"
  }
}
```

**示例**:
```bash
curl -X POST https://api.claudehome.cn/device/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MacBook Pro",
    "platform": "darwin",
    "version": "1.0.0"
  }'
```

---

### 1.2 获取设备信息

获取当前设备的配置信息。

```
GET /device/info
```

**Headers**:
```
X-Device-Token: <device_token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "deviceId": "string - 设备ID",
    "name": "string - 设备名称",
    "platform": "string - 操作系统",
    "channels": ["feishu", "wechat", "email", "sms"],
    "lastSeen": "string - 最后活跃时间"
  }
}
```

---

### 1.3 更新通道配置

更新设备的通知通道配置。

```
PUT /device/channels
```

**Headers**:
```
X-Device-Token: <device_token>
```

**请求体**:
```json
{
  "channels": [
    {
      "type": "feishu",
      "enabled": true,
      "config": {
        "webhookUrl": "https://open.feishu.cn/open-apis/bot/v2/hook/xxx",
        "secret": "string (可选) - 签名密钥"
      }
    },
    {
      "type": "wechat",
      "enabled": true,
      "config": {
        "corpId": "string - 企业ID",
        "agentId": "string - 应用ID",
        "secret": "string - 应用密钥"
      }
    },
    {
      "type": "email",
      "enabled": true,
      "config": {
        "address": "user@example.com"
      }
    },
    {
      "type": "sms",
      "enabled": false,
      "config": {
        "phone": "13800138000",
        "countryCode": "+86"
      }
    }
  ]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "updated": true,
    "channels": ["feishu", "wechat", "email"]
  }
}
```

---

## 2. 通知服务 API

### 2.1 发送通知

发送任务状态通知到配置的通道。

```
POST /notify
```

**Headers**:
```
X-Device-Token: <device_token>
```

**请求体**:
```json
{
  "type": "task_completed | task_failed | task_started | task_progress | task_cancelled | system",
  "task": {
    "taskId": "string - 任务唯一标识",
    "description": "string - 任务描述",
    "startTime": "string - ISO 8601 开始时间",
    "status": "running | completed | failed | cancelled | paused",
    "duration": "number (可选) - 持续时间(毫秒)",
    "result": "string (可选) - 任务结果摘要",
    "error": "string (可选) - 错误信息",
    "metadata": {}
  },
  "channels": ["feishu", "wechat"],
  "priority": "low | normal | high | urgent",
  "title": "string (可选) - 自定义标题",
  "body": "string (可选) - 自定义内容",
  "actions": [
    {
      "id": "string - 操作ID",
      "label": "string - 按钮文本",
      "value": "string - 操作值",
      "primary": "boolean - 是否主要操作"
    }
  ]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "sent": true,
    "channels": [
      {
        "channel": "feishu",
        "success": true,
        "messageId": "string"
      },
      {
        "channel": "wechat",
        "success": false,
        "error": "Access token expired"
      }
    ],
    "timestamp": "string - ISO 8601"
  }
}
```

---

### 2.2 测试通知

发送测试通知以验证通道配置。

```
POST /notify/test
```

**Headers**:
```
X-Device-Token: <device_token>
```

**请求体**:
```json
{
  "channel": "feishu | wechat | email | sms"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "sent": true,
    "channel": "feishu",
    "messageId": "string"
  }
}
```

---

## 3. 插件推荐 API

### 3.1 获取插件推荐

根据用户环境获取智能插件推荐。

```
POST /plugins/recommend
```

**Headers**:
```
X-Device-Token: <device_token>
```

**请求体**:
```json
{
  "os": "darwin | linux | win32",
  "codeTool": "claude-code | codex | aider | cursor",
  "installedPlugins": ["plugin-id-1", "plugin-id-2"],
  "preferredLang": "zh-CN | en | ja",
  "userTags": ["git", "docker", "typescript"],
  "category": "mcp | workflow | integration | utility",
  "limit": 10
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "string - 插件ID",
        "name": "string - 插件名称",
        "description": {
          "zh-CN": "中文描述",
          "en": "English description"
        },
        "category": "mcp | workflow | integration | utility",
        "popularity": 85,
        "rating": 4.5,
        "ratingCount": 120,
        "tags": ["git", "automation"],
        "installCommand": "npx ccjk install plugin-name",
        "compatibility": {
          "os": ["darwin", "linux", "win32"],
          "codeTools": ["claude-code", "cursor"]
        },
        "version": "1.2.0",
        "author": "author-name",
        "repository": "https://github.com/...",
        "downloads": 5000,
        "verified": true,
        "recommendationScore": 92,
        "recommendationReason": {
          "zh-CN": "基于您的 Git 使用习惯推荐",
          "en": "Recommended based on your Git usage"
        }
      }
    ],
    "total": 25,
    "algorithmVersion": "v2.1"
  }
}
```

---

### 3.2 获取插件列表

获取所有可用插件。

```
GET /plugins
```

**Query 参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| category | string | 按分类筛选 |
| tags | string | 按标签筛选(逗号分隔) |
| search | string | 搜索关键词 |
| page | number | 页码(默认 1) |
| pageSize | number | 每页数量(默认 20) |
| sortBy | string | 排序字段: popularity, rating, downloads |
| sortDir | string | 排序方向: asc, desc |

**响应**:
```json
{
  "success": true,
  "data": {
    "plugins": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

---

## 4. Skills 同步 API

### 4.1 获取云端 Skills 列表

```
GET /skills
```

**Headers**:
```
Authorization: Bearer <device_token>
```

**Query 参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| privacy | string | private, team, public |
| author | string | 作者筛选 |
| tags | string | 标签筛选(逗号分隔) |
| query | string | 搜索关键词 |
| page | number | 页码 |
| pageSize | number | 每页数量 |
| sortBy | string | 排序字段: name, updatedAt, downloads |
| sortDir | string | asc, desc |

**响应**:
```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "id": "string - Skill ID",
        "name": "string - Skill 名称",
        "version": "string - 版本号",
        "content": "string - Skill 内容(Markdown)",
        "checksum": "string - SHA256 校验和",
        "metadata": {
          "author": "string",
          "description": "string",
          "tags": ["tag1", "tag2"],
          "category": "string"
        },
        "privacy": "private | team | public",
        "createdAt": "string - ISO 8601",
        "updatedAt": "string - ISO 8601",
        "downloads": 100
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### 4.2 获取单个 Skill

```
GET /skills/:skillId
```

**Query 参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| version | string | 指定版本(可选) |

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "skill-id",
    "name": "Skill Name",
    "version": "1.0.0",
    "content": "# Skill Content...",
    "checksum": "sha256-hash",
    "metadata": {...},
    "privacy": "private",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T00:00:00Z"
  }
}
```

---

### 4.3 上传 Skill

```
POST /skills
```

**请求体**:
```json
{
  "name": "string (必填) - Skill 名称",
  "version": "string (必填) - 语义化版本号",
  "content": "string (必填) - Skill 内容(Markdown)",
  "metadata": {
    "author": "string (必填) - 作者",
    "description": "string - 描述",
    "tags": ["tag1", "tag2"],
    "category": "string - 分类"
  },
  "privacy": "private | team | public",
  "checksum": "string - SHA256 校验和"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "generated-skill-id",
    "name": "Skill Name",
    "version": "1.0.0",
    ...
  }
}
```

---

### 4.4 更新 Skill

```
PUT /skills/:skillId
```

**请求体**: 同上传 Skill，所有字段可选

---

### 4.5 删除 Skill

```
DELETE /skills/:skillId
```

**响应**:
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

---

## 5. Agents 同步 API

### 5.1 上传 Agent

```
POST /agents/upload
```

**Headers**:
```
X-Device-Token: <device_token>
```

**请求体**:
```json
{
  "id": "string - Agent ID",
  "name": "string - Agent 名称",
  "version": "string - 版本号 (如 1.0.0)",
  "definition": {
    "role": "string - Agent 角色",
    "systemPrompt": "string - 系统提示词",
    "capabilities": ["capability1", "capability2"],
    "tools": ["tool1", "tool2"],
    "constraints": ["constraint1"],
    "examples": [
      {
        "input": "string",
        "output": "string"
      }
    ]
  },
  "metadata": {
    "author": "string",
    "description": {
      "zh-CN": "中文描述",
      "en": "English description"
    },
    "tags": ["tag1", "tag2"],
    "category": "coding | writing | analysis | automation | other",
    "createdAt": "string - ISO 8601",
    "updatedAt": "string - ISO 8601",
    "usageCount": 0,
    "rating": 0,
    "ratingCount": 0
  },
  "privacy": "private | team | public"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "agent-id",
    "uploaded": true
  }
}
```

---

### 5.2 获取 Agent 列表

```
GET /agents/list
```

**响应**:
```json
{
  "success": true,
  "data": {
    "agents": [...]
  }
}
```

---

### 5.3 搜索 Agents

```
POST /agents/search
```

**请求体**:
```json
{
  "query": "string - 搜索关键词",
  "category": "coding | writing | analysis | automation",
  "tags": ["tag1", "tag2"],
  "author": "string",
  "privacy": "private | team | public",
  "minRating": 4.0,
  "offset": 0,
  "limit": 10,
  "sortBy": "rating | downloads | updatedAt",
  "sortDir": "asc | desc"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "agents": [...],
    "total": 100
  }
}
```

---

### 5.4 获取 Agent 统计

```
GET /agents/:agentId/stats
```

**响应**:
```json
{
  "success": true,
  "data": {
    "agentId": "string",
    "totalDownloads": 1000,
    "activeUsers": 50,
    "averageRating": 4.5,
    "ratingDistribution": {
      "1": 5,
      "2": 10,
      "3": 20,
      "4": 100,
      "5": 200
    },
    "usageByDay": [
      {"date": "2024-01-01", "count": 50}
    ]
  }
}
```

---

### 5.5 评价 Agent

```
POST /agents/rate
```

**请求体**:
```json
{
  "agentId": "string",
  "rating": 5,
  "comment": "string (可选)",
  "tags": ["helpful", "accurate"]
}
```

---

## 6. CLAUDE.md 同步 API

### 6.1 上传 CLAUDE.md

```
POST /claude-md/upload
```

**Headers**:
```
X-Device-Token: <device_token>
```

**请求体**:
```json
{
  "content": "string - CLAUDE.md 文件内容",
  "name": "string - 配置名称",
  "projectType": "string - 项目类型 (nodejs, python, rust...)",
  "privacy": "private | team | public",
  "description": "string (可选) - 描述",
  "tags": ["tag1", "tag2"]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "config-id"
  }
}
```

---

### 6.2 下载 CLAUDE.md

```
GET /claude-md/download/:configId
```

**响应**:
```json
{
  "success": true,
  "data": {
    "content": "string - CLAUDE.md 内容"
  }
}
```

---

### 6.3 获取配置列表

```
GET /claude-md/list
```

**响应**:
```json
{
  "success": true,
  "data": {
    "configs": [
      {
        "id": "string",
        "name": "string",
        "projectType": "string",
        "content": "string",
        "metadata": {
          "author": "string",
          "description": "string",
          "tags": [],
          "createdAt": "string",
          "updatedAt": "string",
          "usageCount": 0,
          "rating": 0
        },
        "privacy": "private",
        "template": false
      }
    ]
  }
}
```

---

### 6.4 删除配置

```
DELETE /claude-md/delete/:configId
```

---

### 6.5 版本管理

#### 保存版本
```
POST /claude-md/version/:configId
```

**请求体**:
```json
{
  "message": "string - 版本说明"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "versionId": "string"
  }
}
```

#### 获取版本历史
```
GET /claude-md/versions/:configId
```

**响应**:
```json
{
  "success": true,
  "data": {
    "versions": [
      {
        "id": "string",
        "timestamp": "string",
        "message": "string",
        "content": "string"
      }
    ]
  }
}
```

#### 回滚版本
```
POST /claude-md/rollback/:configId/:versionId
```

---

## 7. Hooks 同步 API

### 7.1 上传 Hooks

```
POST /hooks/upload
```

**Headers**:
```
Authorization: Bearer <api_key>
```

**请求体**:
```json
{
  "hooks": [
    {
      "id": "string - Hook ID",
      "name": "string - Hook 名称",
      "version": "string - 版本号",
      "trigger": {
        "type": "file_change | command | schedule | event",
        "pattern": "string (可选) - 文件匹配模式",
        "command": "string (可选) - 触发命令",
        "schedule": "string (可选) - Cron 表达式",
        "event": "string (可选) - 事件名称"
      },
      "actions": [
        {
          "type": "run_command | call_api | notify | transform",
          "config": {}
        }
      ],
      "conditions": [
        {
          "field": "string - 检查字段",
          "operator": "eq | ne | contains | matches",
          "value": "string - 期望值"
        }
      ],
      "metadata": {
        "author": "string",
        "description": "string",
        "tags": [],
        "category": "string",
        "createdAt": "string",
        "updatedAt": "string"
      },
      "privacy": "private | team | public",
      "enabled": true
    }
  ]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "uploaded": 5,
    "downloaded": 0,
    "skipped": 1,
    "failed": 0,
    "errors": [],
    "timestamp": "string"
  }
}
```

---

### 7.2 下载 Hooks

```
GET /hooks/download
```

**Query 参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| privacy | string | private, team, public |
| category | string | 分类筛选 |
| tags | string | 标签筛选(可多个) |

**响应**:
```json
{
  "success": true,
  "data": [...]
}
```

---

### 7.3 同步 Hooks (双向)

```
POST /hooks/sync
```

**请求体**:
```json
{
  "hooks": [...],
  "options": {
    "direction": "upload | download | bidirectional",
    "overwrite": false,
    "privacy": "private",
    "category": "string",
    "tags": []
  }
}
```

---

### 7.4 获取 Hook 模板

```
GET /hooks/templates
```

**Query 参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| category | string | 分类 |
| tags | string | 标签 |
| language | string | 语言: zh-CN, en |

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "template-id",
      "name": "Git Pre-commit Hook",
      "category": "git",
      "description": "自动格式化代码",
      "hook": {...},
      "variables": ["PROJECT_PATH", "LINT_COMMAND"]
    }
  ]
}
```

---

### 7.5 Hook 管理

#### 获取单个 Hook
```
GET /hooks/:hookId
```

#### 删除 Hook
```
DELETE /hooks/:hookId
```

#### 启用/禁用 Hook
```
PUT /hooks/:hookId/enabled
```

**请求体**:
```json
{
  "enabled": true
}
```

---

### 7.6 获取执行日志

```
GET /hooks/:hookId/logs
```

**Query 参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| limit | number | 返回数量限制 |
| offset | number | 分页偏移 |
| status | string | success, failed, skipped |

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "log-id",
      "hookId": "hook-id",
      "hookName": "Hook Name",
      "timestamp": "string",
      "status": "success | failed | skipped",
      "durationMs": 150,
      "trigger": "string",
      "output": "string",
      "error": "string (如果失败)"
    }
  ]
}
```

---

## 8. 通用响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 错误响应

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 9. 错误码说明

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| `UNAUTHORIZED` | 401 | 未提供认证令牌或令牌无效 |
| `FORBIDDEN` | 403 | 无权访问该资源 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `RATE_LIMITED` | 429 | 请求频率超限 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `TIMEOUT` | 504 | 请求超时 |
| `NETWORK_ERROR` | - | 网络连接失败 |
| `DEVICE_NOT_REGISTERED` | 401 | 设备未注册 |
| `CHANNEL_CONFIG_INVALID` | 400 | 通道配置无效 |
| `WEBHOOK_FAILED` | 502 | Webhook 调用失败 |
| `SKILL_NOT_FOUND` | 404 | Skill 不存在 |
| `AGENT_NOT_FOUND` | 404 | Agent 不存在 |
| `VERSION_CONFLICT` | 409 | 版本冲突 |

---

## 10. 速率限制

| 端点类型 | 限制 |
|----------|------|
| 设备注册 | 10 次/小时/IP |
| 通知发送 | 100 次/分钟/设备 |
| 同步操作 | 60 次/分钟/设备 |
| 搜索查询 | 30 次/分钟/设备 |

超过限制时返回 `429 Too Many Requests`，响应头包含:
- `X-RateLimit-Limit`: 限制次数
- `X-RateLimit-Remaining`: 剩余次数
- `X-RateLimit-Reset`: 重置时间(Unix 时间戳)

---

## 11. 实现状态

### ✅ 已实现
- `POST /device/register` - 设备注册
- `GET /device/info` - 获取设备信息
- `PUT /device/channels` - 更新通道配置
- `GET /health` - 健康检查

### ⚠️ 需要修复
- `POST /notify` - 通知发送 (飞书 webhook 调用失败)
- `POST /notify/test` - 测试通知

### ❌ 待实现
- `POST /plugins/recommend` - 插件推荐
- `GET /plugins` - 插件列表
- `GET/POST/PUT/DELETE /skills/*` - Skills 同步
- `GET/POST /agents/*` - Agents 同步
- `GET/POST/DELETE /claude-md/*` - CLAUDE.md 同步
- `GET/POST/DELETE /hooks/*` - Hooks 同步

---

## 12. 联系方式

如有问题，请联系后端开发团队或提交 Issue。
