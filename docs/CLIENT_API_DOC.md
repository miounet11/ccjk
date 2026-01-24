# CCJK Cloud API 客户端对接文档

> **Base URL**: `https://api.claudehome.cn`
> **Version**: 2.0.0
> **Last Updated**: 2026-01-25

---

## 📋 目录

1. [概述](#概述)
2. [快速开始](#快速开始)
3. [认证机制](#认证机制)
4. [设备绑定流程](#设备绑定流程)
5. [API 端点详情](#api-端点详情)
   - [认证相关](#1-认证相关-auth)
   - [设备绑定](#2-设备绑定-bind)
   - [设备管理](#3-设备管理-device)
   - [消息通知](#4-消息通知-notify)
   - [回复处理](#5-回复处理-reply)
6. [v8 Templates API](#v8-templates-api) ⭐ **NEW**
7. [通知渠道配置](#通知渠道配置)
8. [错误码说明](#错误码说明)
9. [最佳实践](#最佳实践)

---

## 概述

CCJK Cloud 是 Claude Code JinKu 的云服务后端，提供以下核心能力：

- 🔐 **用户认证** - 邮箱验证码登录
- 📱 **设备绑定** - 6位绑定码快速绑定
- 📢 **消息推送** - 支持飞书、钉钉、企业微信等多渠道
- 💬 **双向通信** - 支持用户回复和交互

### 两种认证方式

| 认证方式 | Header | 使用场景 |
|---------|--------|---------|
| **用户认证** | `Authorization: Bearer <session_token>` | Web 端管理、生成绑定码 |
| **设备认证** | `X-Device-Token: <device_token>` | CLI 客户端、发送通知 |

---

## 快速开始

### CLI 客户端绑定流程（推荐）

```bash
# 1. 用户在网页端登录后获取 6 位绑定码（如：A3X9K2）

# 2. CLI 使用绑定码注册设备
curl -X POST https://api.claudehome.cn/bind/use \
  -H "Content-Type: application/json" \
  -d '{
    "code": "A3X9K2",
    "device": {
      "name": "MacBook Pro",
      "platform": "darwin",
      "hostname": "my-mac.local",
      "version": "1.0.0"
    }
  }'

# 响应：
# {
#   "success": true,
#   "data": {
#     "deviceId": "dev_abc123",
#     "deviceToken": "dt_xxxxxxxxxxxxxxxx",
#     "userId": "usr_xyz789",
#     "message": "Device bound successfully"
#   }
# }

# 3. 保存 deviceToken，后续所有请求使用此 token
```

### 发送通知示例

```bash
curl -X POST https://api.claudehome.cn/notify \
  -H "Content-Type: application/json" \
  -H "X-Device-Token: dt_xxxxxxxxxxxxxxxx" \
  -d '{
    "type": "task_completed",
    "title": "✅ 任务完成",
    "body": "代码重构已完成，共修改 15 个文件。"
  }'
```

---

## 认证机制

### 用户认证（Web 端）

用于网页端管理设备、生成绑定码等操作。

```
Authorization: Bearer <session_token>
```

**获取 session_token 流程：**
1. 调用 `/auth/login` 发送验证码到邮箱
2. 调用 `/auth/verify` 验证并获取 token

### 设备认证（CLI 端）

用于 CLI 客户端发送通知、查询状态等操作。

```
X-Device-Token: <device_token>
```

**获取 device_token 流程：**
1. 用户在网页生成绑定码
2. CLI 调用 `/bind/use` 使用绑定码获取 token

---

## 设备绑定流程

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Web 端       │     │   CCJK Cloud    │     │    CLI 端       │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. POST /auth/login  │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │  2. POST /auth/verify │                       │
         │──────────────────────>│                       │
         │  <session_token>      │                       │
         │<──────────────────────│                       │
         │                       │                       │
         │  3. POST /bind/generate                       │
         │──────────────────────>│                       │
         │  <bind_code: A3X9K2>  │                       │
         │<──────────────────────│                       │
         │                       │                       │
         │         4. 用户将绑定码告知 CLI               │
         │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ >│
         │                       │                       │
         │                       │  5. POST /bind/use    │
         │                       │<──────────────────────│
         │                       │  <device_token>       │
         │                       │──────────────────────>│
         │                       │                       │
         │  6. GET /bind/status/:code (轮询)            │
         │──────────────────────>│                       │
         │  <status: bound>      │                       │
         │<──────────────────────│                       │
         │                       │                       │
```

---

## API 端点详情

### 1. 认证相关 (`/auth`)

#### POST `/auth/login`
发送验证码到邮箱

**请求：**
```json
{
  "email": "user@example.com"
}
```

**响应：**
```json
{
  "success": true,
  "message": "Verification code sent to your email",
  "_dev_code": "123456"  // 仅开发环境返回
}
```

---

#### POST `/auth/verify`
验证邮箱验证码，获取 session token

**请求：**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "token": "sess_xxxxxxxxxxxxxxxx",
    "expiresAt": "2025-01-17T10:00:00.000Z",
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com"
    }
  }
}
```

---

#### GET `/auth/me`
获取当前用户信息

**Headers：**
```
Authorization: Bearer <session_token>
```

**响应：**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com"
    }
  }
}
```

---

#### POST `/auth/logout`
登出，使 session 失效

**Headers：**
```
Authorization: Bearer <session_token>
```

**响应：**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 2. 设备绑定 (`/bind`)

#### POST `/bind/generate`
生成 6 位绑定码（需要用户认证）

**Headers：**
```
Authorization: Bearer <session_token>
```

**响应：**
```json
{
  "success": true,
  "data": {
    "code": "A3X9K2",
    "expiresAt": "2025-01-10T10:05:00.000Z",
    "expiresIn": 300
  }
}
```

> ⚠️ 绑定码有效期 5 分钟，过期需重新生成

---

#### POST `/bind/use`
使用绑定码注册设备（**CLI 核心接口**）

**请求：**
```json
{
  "code": "A3X9K2",
  "device": {
    "name": "MacBook Pro",
    "platform": "darwin",
    "hostname": "my-mac.local",
    "version": "1.0.0"
  }
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "deviceId": "dev_abc123",
    "deviceToken": "dt_xxxxxxxxxxxxxxxxxxxxxxxx",
    "userId": "usr_xyz789",
    "message": "Device bound successfully"
  }
}
```

> 💡 **重要**：`deviceToken` 需要安全存储，后续所有 CLI 请求都需要此 token

---

#### GET `/bind/status/:code`
查询绑定码状态（Web 端轮询用）

**Headers：**
```
Authorization: Bearer <session_token>
```

**响应：**
```json
// 等待绑定
{
  "success": true,
  "data": {
    "status": "pending",
    "expiresAt": "2025-01-10T10:05:00.000Z"
  }
}

// 已绑定
{
  "success": true,
  "data": {
    "status": "bound",
    "device": {
      "id": "dev_abc123",
      "name": "MacBook Pro",
      "platform": "darwin"
    }
  }
}

// 已过期
{
  "success": true,
  "data": {
    "status": "expired"
  }
}
```

---

#### GET `/bind/devices`
获取用户所有设备列表

**Headers：**
```
Authorization: Bearer <session_token>
```

**响应：**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "dev_abc123",
        "name": "MacBook Pro",
        "platform": "darwin",
        "hostname": "my-mac.local",
        "version": "1.0.0",
        "createdAt": "2025-01-10T09:00:00.000Z",
        "lastSeenAt": "2025-01-10T10:30:00.000Z",
        "channels": [
          { "type": "feishu", "enabled": true, "configured": true },
          { "type": "dingtalk", "enabled": false, "configured": false }
        ]
      }
    ]
  }
}
```

---

#### DELETE `/bind/devices/:id`
删除指定设备

**Headers：**
```
Authorization: Bearer <session_token>
```

**响应：**
```json
{
  "success": true,
  "message": "Device deleted successfully"
}
```

---

### 3. 设备管理 (`/device`)

#### POST `/device/register`
直接注册设备（不通过绑定码，设备不关联用户）

**请求：**
```json
{
  "token": "existing_token_if_any",  // 可选，用于刷新
  "name": "MacBook Pro",
  "platform": "darwin",
  "hostname": "my-mac.local",
  "version": "1.0.0"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "deviceId": "dev_abc123",
    "token": "dt_xxxxxxxxxxxxxxxx",
    "isNew": true
  }
}
```

---

#### GET `/device/info`
获取设备信息

**Headers：**
```
X-Device-Token: <device_token>
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "dev_abc123",
    "name": "MacBook Pro",
    "platform": "darwin",
    "hostname": "my-mac.local",
    "version": "1.0.0",
    "userId": "usr_xyz789",
    "createdAt": "2025-01-10T09:00:00.000Z",
    "lastSeenAt": "2025-01-10T10:30:00.000Z",
    "channels": [
      { "type": "feishu", "enabled": true, "configured": true },
      { "type": "dingtalk", "enabled": false, "configured": false }
    ]
  }
}
```

---

#### GET `/device/channels`
获取设备通知渠道配置详情

**Headers：**
```
X-Device-Token: <device_token>
```

**响应：**
```json
{
  "success": true,
  "data": {
    "channels": [
      {
        "type": "feishu",
        "enabled": true,
        "config": {
          "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
        }
      },
      {
        "type": "dingtalk",
        "enabled": false,
        "config": {}
      }
    ]
  }
}
```

---

#### PUT `/device/channels`
更新设备通知渠道配置

**Headers：**
```
X-Device-Token: <device_token>
```

**请求：**
```json
{
  "channels": [
    {
      "type": "feishu",
      "enabled": true,
      "config": {
        "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/xxx",
        "secret": "optional_sign_secret"
      }
    },
    {
      "type": "dingtalk",
      "enabled": true,
      "config": {
        "webhook": "https://oapi.dingtalk.com/robot/send?access_token=xxx",
        "secret": "SECxxx"
      }
    }
  ]
}
```

**响应：**
```json
{
  "success": true,
  "message": "Channels updated successfully"
}
```

---

#### POST `/device/regenerate-token`
重新生成设备 token

**Headers：**
```
X-Device-Token: <device_token>
```

**响应：**
```json
{
  "success": true,
  "data": {
    "token": "dt_new_token_xxxxxxxx"
  }
}
```

> ⚠️ 旧 token 立即失效，需要更新客户端存储

---

#### DELETE `/device`
删除当前设备

**Headers：**
```
X-Device-Token: <device_token>
```

**响应：**
```json
{
  "success": true,
  "message": "Device deleted successfully"
}
```

---

### 4. 消息通知 (`/notify`)

#### POST `/notify`
发送通知（**CLI 核心接口**）

**Headers：**
```
X-Device-Token: <device_token>
```

**请求：**
```json
{
  "type": "task_completed",
  "title": "✅ 任务完成",
  "body": "代码重构已完成，共修改 15 个文件。\n\n详情：\n- 重构了 auth 模块\n- 优化了数据库查询\n- 添加了单元测试",
  "data": {
    "taskId": "task_123",
    "duration": 3600,
    "filesChanged": 15
  },
  "channels": ["feishu", "dingtalk"],
  "waitReply": false
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| `type` | string | ✅ | 通知类型：`task_progress`, `task_completed`, `task_failed`, `ask_user`, `custom` |
| `title` | string | ✅ | 通知标题（1-100 字符） |
| `body` | string | ✅ | 通知内容（1-4000 字符） |
| `data` | object | ❌ | 附加数据 |
| `channels` | array | ❌ | 指定渠道，不填则发送到所有已启用渠道 |
| `waitReply` | boolean | ❌ | 是否等待用户回复 |

**响应：**
```json
{
  "success": true,
  "data": {
    "notificationId": "notif_abc123",
    "sent": true,
    "channels": [
      { "type": "feishu", "success": true },
      { "type": "dingtalk", "success": true }
    ]
  }
}
```

---

#### POST `/notify/test`
发送测试通知

**Headers：**
```
X-Device-Token: <device_token>
```

**响应：**
```json
{
  "success": true,
  "data": {
    "notificationId": "notif_test123",
    "channels": [
      { "type": "feishu", "success": true },
      { "type": "dingtalk", "success": false, "error": "Invalid webhook URL" }
    ]
  }
}
```

---

#### GET `/notify/history`
获取通知历史

**Headers：**
```
X-Device-Token: <device_token>
```

**Query 参数：**
- `limit` - 返回数量，默认 50

**响应：**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_abc123",
        "type": "task_completed",
        "title": "✅ 任务完成",
        "body": "代码重构已完成...",
        "status": "sent",
        "createdAt": "2025-01-10T10:30:00.000Z"
      }
    ]
  }
}
```

---

### 5. 回复处理 (`/reply`)

#### GET `/reply/poll`
长轮询获取用户回复（**CLI 核心接口**）

**Headers：**
```
X-Device-Token: <device_token>
```

**Query 参数：**
- `since` - ISO 时间戳，只返回此时间之后的回复
- `timeout` - 超时时间（秒），默认 30，最大 60

**响应：**
```json
{
  "success": true,
  "replies": [
    {
      "id": "reply_abc123",
      "notificationId": "notif_xyz789",
      "channel": "feishu",
      "content": "approved",
      "metadata": {
        "openId": "ou_xxx",
        "action": "button_click"
      },
      "createdAt": "2025-01-10T10:35:00.000Z"
    }
  ]
}
```

---

#### GET `/reply/:notificationId`
获取指定通知的回复

**Headers：**
```
X-Device-Token: <device_token>
```

**响应：**
```json
// 已回复
{
  "success": true,
  "status": "replied",
  "reply": {
    "id": "reply_abc123",
    "channel": "feishu",
    "content": "approved",
    "metadata": { ... },
    "createdAt": "2025-01-10T10:35:00.000Z"
  }
}

// 等待回复
{
  "success": true,
  "status": "pending"
}

// 通知不存在
{
  "success": true,
  "status": "not_found"
}
```

---

#### GET `/reply/history`
获取回复历史

**Headers：**
```
X-Device-Token: <device_token>
```

**Query 参数：**
- `limit` - 返回数量，默认 50

**响应：**
```json
{
  "success": true,
  "replies": [
    {
      "id": "reply_abc123",
      "notificationId": "notif_xyz789",
      "channel": "feishu",
      "content": "approved",
      "createdAt": "2025-01-10T10:35:00.000Z"
    }
  ]
}
```

---

#### POST `/reply/manual`
手动提交回复（测试用）

**Headers：**
```
X-Device-Token: <device_token>
```

**请求：**
```json
{
  "notificationId": "notif_xyz789",
  "content": "approved",
  "channel": "manual"
}
```

**响应：**
```json
{
  "success": true,
  "reply": {
    "id": "reply_abc123",
    "channel": "manual",
    "content": "approved",
    "createdAt": "2025-01-10T10:35:00.000Z"
  }
}
```

---

#### Webhook 回调端点

以下端点用于接收各渠道的回调：

| 渠道 | 端点 | 说明 |
|-----|------|------|
| 飞书 | `POST /reply/feishu` | 飞书机器人卡片回调 |
| 企业微信 | `POST /reply/wechat` | 企业微信消息回调 |
| 钉钉 | `POST /reply/dingtalk` | 钉钉机器人回调 |

---

## v8 Templates API

> ⭐ **NEW** - 2026-01-25 更新

v8 Templates API 提供统一的模板管理接口，包含 Agent、MCP、Skill、Hook 四种类型。

### 模板统计

| 类型 | 数量 | 说明 |
|------|------|------|
| **Agent** | 56 | AI 专业代理（含 19 个专业技能代理） |
| **MCP** | 50 | MCP 服务器（含 16 个官方 MCP） |
| **Skill** | 36 | 技能命令（含 22 个增强技能） |
| **Hook** | 41 | 开发钩子（含 23 个增强钩子） |
| **总计** | **183** | |

### 新增专业代理

| 分类 | 代理 |
|------|------|
| `frontend` | React Specialist, Vue Specialist, TypeScript Architect, Tailwind CSS Specialist |
| `backend` | Node.js Architect, Python Expert, Go Specialist, Rust Expert |
| `ai-ml` | LLM Integration Specialist, ML Pipeline Engineer |
| `devops` | Kubernetes Expert, Terraform Architect, CI/CD Engineer |
| `database` | PostgreSQL Expert, MongoDB Specialist, Redis Expert |
| `security` | Security Auditor, Auth Specialist |
| `testing` | Testing Specialist |

### 新增官方 MCP 服务

| 服务 | 分类 | 说明 |
|------|------|------|
| Filesystem MCP | `core` | 文件系统操作 |
| GitHub MCP | `development` | GitHub API 集成 |
| PostgreSQL MCP | `database` | PostgreSQL 操作 |
| SQLite MCP | `database` | SQLite 操作 |
| Puppeteer MCP | `automation` | 浏览器自动化 |
| Fetch MCP | `networking` | HTTP 请求 |
| Memory MCP | `core` | 持久化记忆 |
| Sequential Thinking MCP | `reasoning` | 结构化推理 |
| Context7 MCP | `documentation` | 文档查询 |
| DeepWiki MCP | `documentation` | 仓库分析 |

### API 端点

#### GET `/api/v8/templates`
列表模板

```bash
curl "https://api.claudehome.cn/api/v8/templates?type=agent&category=frontend&limit=20"
```

**Query 参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `type` | string | 模板类型：`skill`, `mcp`, `agent`, `hook` |
| `category` | string | 分类筛选 |
| `tags` | string | 标签筛选（逗号分隔） |
| `is_official` | boolean | 仅官方模板 |
| `is_featured` | boolean | 仅精选模板 |
| `sortBy` | string | 排序：`download_count`, `rating_average`, `updated_at` |
| `limit` | number | 返回数量（默认 20，最大 100） |
| `offset` | number | 偏移量 |

**响应：**
```json
{
  "code": 200,
  "message": "Retrieved 20 templates",
  "data": {
    "items": [...],
    "total": 56,
    "limit": 20,
    "offset": 0
  }
}
```

---

#### GET `/api/v8/templates/:templateId`
获取单个模板

```bash
curl "https://api.claudehome.cn/api/v8/templates/tpl_abc123"
```

**响应：**
```json
{
  "code": 200,
  "message": "Template retrieved successfully",
  "data": {
    "id": "tpl_abc123",
    "type": "agent",
    "name_en": "React Specialist",
    "name_zh_cn": "React 专家",
    "description_en": "Expert in React 18+, Next.js, React Server Components",
    "category": "frontend",
    "tags": ["react", "nextjs", "typescript"],
    "author": "CCJK Team",
    "version": "1.0.0",
    "install_command": "ccjk agent install react-specialist",
    "requirements": ["claude-api-key"],
    "compatibility": {
      "platforms": ["linux", "macos", "windows"],
      "frameworks": ["react", "nextjs", "remix"]
    },
    "usage_examples": [...],
    "is_official": true,
    "is_featured": true,
    "download_count": 1500,
    "rating_average": 4.8
  }
}
```

---

#### POST `/api/v8/templates/batch`
批量获取模板

```bash
curl -X POST "https://api.claudehome.cn/api/v8/templates/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["tpl_abc123", "tpl_def456"],
    "language": "zh-CN"
  }'
```

**响应：**
```json
{
  "requestId": "req_xxx",
  "templates": {
    "tpl_abc123": { ... },
    "tpl_def456": { ... }
  },
  "notFound": []
}
```

---

#### GET `/api/v8/templates/search`
搜索模板

```bash
curl "https://api.claudehome.cn/api/v8/templates/search?query=react&type=agent"
```

---

#### GET `/api/v8/templates/featured`
获取精选模板

```bash
curl "https://api.claudehome.cn/api/v8/templates/featured?limit=10"
```

---

#### GET `/api/v8/templates/popular`
获取热门模板

```bash
curl "https://api.claudehome.cn/api/v8/templates/popular?limit=20"
```

---

### TypeScript 客户端示例

```typescript
class TemplatesClient {
  private baseUrl = 'https://api.claudehome.cn';

  // 获取专业代理列表
  async getSpecialistAgents(category?: string): Promise<Template[]> {
    const params = new URLSearchParams({ type: 'agent', limit: '50' });
    if (category) params.set('category', category);

    const response = await fetch(`${this.baseUrl}/api/v8/templates?${params}`);
    const data = await response.json();
    return data.data?.items || [];
  }

  // 获取官方 MCP 服务
  async getOfficialMcpServers(): Promise<Template[]> {
    const response = await fetch(
      `${this.baseUrl}/api/v8/templates?type=mcp&is_official=true&limit=50`
    );
    const data = await response.json();
    return data.data?.items || [];
  }

  // 搜索模板
  async searchTemplates(query: string, type?: string): Promise<Template[]> {
    const params = new URLSearchParams({ query });
    if (type) params.set('type', type);

    const response = await fetch(
      `${this.baseUrl}/api/v8/templates/search?${params}`
    );
    const data = await response.json();
    return data.data?.items || [];
  }

  // 批量获取模板
  async batchGetTemplates(ids: string[]): Promise<Record<string, Template>> {
    const response = await fetch(`${this.baseUrl}/api/v8/templates/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    const data = await response.json();
    return data.templates || {};
  }
}
```

### 使用示例

```typescript
const client = new TemplatesClient();

// 获取所有前端专业代理
const frontendAgents = await client.getSpecialistAgents('frontend');
// => [React Specialist, Vue Specialist, TypeScript Architect, Tailwind CSS Specialist]

// 获取所有官方 MCP 服务
const mcpServers = await client.getOfficialMcpServers();
// => [Filesystem MCP, GitHub MCP, PostgreSQL MCP, ...]

// 搜索 Git 相关钩子
const gitHooks = await client.searchTemplates('git', 'hook');
// => [Smart Commit, Branch Cleanup, Commitlint, ...]
```

> 📖 **完整文档**: 详见 [docs/V8_TEMPLATES_API.md](./docs/V8_TEMPLATES_API.md)

---

## 通知渠道配置

### 飞书 (Feishu)

```json
{
  "type": "feishu",
  "enabled": true,
  "config": {
    "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx",
    "secret": "可选的签名密钥"
  }
}
```

**获取 Webhook：**
1. 打开飞书 → 群设置 → 群机器人 → 添加机器人
2. 选择「自定义机器人」
3. 复制 Webhook 地址

---

### 钉钉 (DingTalk)

```json
{
  "type": "dingtalk",
  "enabled": true,
  "config": {
    "webhook": "https://oapi.dingtalk.com/robot/send?access_token=xxxxxxxx",
    "secret": "SECxxxxxxxx"
  }
}
```

**获取 Webhook：**
1. 打开钉钉 → 群设置 → 智能群助手 → 添加机器人
2. 选择「自定义」机器人
3. 安全设置选择「加签」，复制 Secret
4. 复制 Webhook 地址

---

### 企业微信 (WeCom)

```json
{
  "type": "wechat",
  "enabled": true,
  "config": {
    "webhook": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx"
  }
}
```

**获取 Webhook：**
1. 打开企业微信 → 群设置 → 群机器人 → 添加
2. 复制 Webhook 地址

---

## 错误码说明

### HTTP 状态码

| 状态码 | 说明 |
|-------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或认证失效 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 错误响应格式

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

### 常见错误

| 错误信息 | 说明 | 解决方案 |
|---------|------|---------|
| `Missing X-Device-Token header` | 缺少设备 token | 添加 X-Device-Token header |
| `Missing Authorization header` | 缺少用户认证 | 添加 Authorization header |
| `Device not found` | 设备不存在或 token 无效 | 重新绑定设备 |
| `Invalid or expired session` | Session 过期 | 重新登录 |
| `Invalid or expired bind code` | 绑定码无效或过期 | 重新生成绑定码 |
| `No enabled notification channels` | 没有配置通知渠道 | 配置至少一个通知渠道 |

---

## 最佳实践

### 1. Token 存储

```typescript
// 推荐：存储在用户配置目录
// macOS: ~/.config/ccjk/credentials.json
// Linux: ~/.config/ccjk/credentials.json
// Windows: %APPDATA%\ccjk\credentials.json

interface Credentials {
  deviceToken: string;
  deviceId: string;
  userId: string;
  createdAt: string;
}
```

### 2. 错误重试

```typescript
async function sendNotification(payload: NotificationPayload, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch('https://api.claudehome.cn/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Token': getDeviceToken(),
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return await response.json();
      }

      if (response.status === 401) {
        // Token 失效，需要重新绑定
        throw new Error('Device token expired, please re-bind');
      }
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(1000 * (i + 1)); // 指数退避
    }
  }
}
```

### 3. 长轮询实现

```typescript
async function pollForReplies() {
  let since: string | undefined;

  while (true) {
    try {
      const response = await fetch(
        `https://api.claudehome.cn/reply/poll?timeout=30${since ? `&since=${since}` : ''}`,
        {
          headers: {
            'X-Device-Token': getDeviceToken(),
          },
        }
      );

      const data = await response.json();

      if (data.replies?.length > 0) {
        for (const reply of data.replies) {
          handleReply(reply);
          since = reply.createdAt;
        }
      }
    } catch (error) {
      console.error('Poll error:', error);
      await sleep(5000); // 出错后等待 5 秒重试
    }
  }
}
```

### 4. 通知类型使用建议

| 类型 | 使用场景 | 示例 |
|-----|---------|------|
| `task_progress` | 任务进行中的状态更新 | "正在编译项目..." |
| `task_completed` | 任务成功完成 | "✅ 部署完成" |
| `task_failed` | 任务失败 | "❌ 测试失败：3 个用例未通过" |
| `ask_user` | 需要用户决策 | "是否继续删除这些文件？" |
| `custom` | 自定义通知 | 任意自定义内容 |

---

## 联系支持

- 📧 Email: support@claudehome.cn
- 🌐 Website: https://www.claudehome.cn
- 📖 Documentation: https://www.claudehome.cn/docs

---

*© 2025 CCJK Cloud. All rights reserved.*
